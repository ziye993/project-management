import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { post } from '@/api';
import { fetchMe } from '@/api/user';
import { computeVisibleModulesClient, computeModuleCapabilitiesClient } from '../utils/accessRules';
import { normalizeModuleAccess, type ModuleAccessConfig } from '../constants/moduleAccess';
import { isSameOriginBase, resolveEffectiveLogApiBaseUrl } from '../utils/logApiBase';

export interface OrgPermission {
  orgId: number;
  role: 'manage' | 'view';
  orgName?: string;
}

export interface ProjectPermission {
  projectId: number;
  orgId?: number;
  role: 'manage' | 'view';
  projectName?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  is_super_admin: boolean;
}

export interface ModuleCapability {
  read: boolean;
  write: boolean;
}

export interface AccessContextData {
  channel: string;
  deploymentRole: string;
  publicBaseUrl: string;
  logApiBaseUrl: string;
  user: AuthUser | null;
  isSuperAdmin: boolean;
  orgPermissions: OrgPermission[];
  projectPermissions: ProjectPermission[];
  visibleModules: string[];
  moduleCapabilities: Record<string, ModuleCapability>;
  moduleAccess: ModuleAccessConfig;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AccessContextData {
  loading: boolean;
  refresh: () => Promise<void>;
  canManageLog: boolean;
  hasModule: (key: string) => boolean;
  canReadModule: (key: string) => boolean;
  canWriteModule: (key: string) => boolean;
}

const defaultState: AccessContextData = {
  channel: 'local',
  deploymentRole: 'local_agent',
  publicBaseUrl: '',
  logApiBaseUrl: '',
  user: null,
  isSuperAdmin: false,
  orgPermissions: [],
  projectPermissions: [],
  visibleModules: [],
  moduleCapabilities: {},
  moduleAccess: { requireLogin: [], hidden: [] },
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessContextData>(defaultState);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ctxRes = await post('/system/accessContext', {});
      const ctx = ctxRes.data as AccessContextData;
      const logApiBaseUrl = resolveEffectiveLogApiBaseUrl(ctx.logApiBaseUrl);

      let user = ctx.user;
      let orgPermissions = ctx.orgPermissions || [];
      let projectPermissions = ctx.projectPermissions || [];
      let isAuthenticated = ctx.isAuthenticated;
      let isSuperAdmin = ctx.isSuperAdmin;

      // 跨域时才单独拉远程 me；本机开发同源时 accessContext 已带 Cookie 用户信息
      if (logApiBaseUrl && !isSameOriginBase(logApiBaseUrl)) {
        try {
          const meRes = await fetchMe(logApiBaseUrl);
          if (meRes?.data) {
            user = meRes.data;
            orgPermissions = meRes.data.orgPermissions || [];
            projectPermissions = meRes.data.projectPermissions || [];
            isAuthenticated = true;
            isSuperAdmin = !!meRes.data.is_super_admin;
          }
        } catch {
          /* remote me optional when not logged in */
        }
      }

      const moduleAccess = normalizeModuleAccess(ctx.moduleAccess);

      const visibleModules = computeVisibleModulesClient({
        channel: ctx.channel,
        deploymentRole: ctx.deploymentRole,
        isAuthenticated,
        isSuperAdmin,
        orgPermissions,
        moduleAccess,
      });

      const moduleCapabilities = computeModuleCapabilitiesClient({
        channel: ctx.channel,
        deploymentRole: ctx.deploymentRole,
        isAuthenticated,
        isSuperAdmin,
        orgPermissions,
        visibleModules,
        moduleAccess,
      });

      setState({
        ...ctx,
        logApiBaseUrl,
        user,
        orgPermissions,
        projectPermissions,
        isAuthenticated,
        isSuperAdmin,
        visibleModules,
        moduleCapabilities,
        moduleAccess,
      });
    } catch (err) {
      console.error('[AuthProvider]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canManageLog = useMemo(() => {
    if (state.isSuperAdmin) return true;
    return state.orgPermissions.some(p => p.role === 'manage')
      || state.projectPermissions.some(p => p.role === 'manage');
  }, [state.isSuperAdmin, state.orgPermissions, state.projectPermissions]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    loading,
    refresh,
    canManageLog,
    hasModule: (key: string) => state.visibleModules.includes(key),
    canReadModule: (key: string) => !!state.moduleCapabilities[key]?.read,
    canWriteModule: (key: string) => !!state.moduleCapabilities[key]?.write,
  }), [state, loading, refresh, canManageLog]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
