import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { post } from '@/api';
import { fetchMe } from '@/api/user';
import { computeVisibleModulesClient, computeModuleCapabilitiesClient, matchScopeClient } from '../utils/accessRules';
import { normalizeModuleAccess, type ModuleAccessConfig } from '../constants/moduleAccess';
import { isSameOriginBase, resolveEffectiveLogApiBaseUrl } from '../utils/logApiBase';
import { MODULE_WRITE_CAPS } from '../constants/capabilities';

export interface CapabilityGrant {
  id: number;
  userId?: number;
  capability: string;
  scopeType: 'org' | 'project';
  scopeId: number;
  canDelegate: boolean;
  canRevokePeer: boolean;
  grantedBy?: number | null;
  grantSource?: string;
  createTime?: string;
  updateTime?: string;
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
  grants: CapabilityGrant[];
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
  hasCapability: (
    capability: string,
    scope?: { scopeType: 'org' | 'project' | 'platform'; scopeId?: number },
    projectOrgId?: number | null,
  ) => boolean;
}

const defaultState: AccessContextData = {
  channel: 'local',
  deploymentRole: 'local_agent',
  publicBaseUrl: '',
  logApiBaseUrl: '',
  user: null,
  isSuperAdmin: false,
  grants: [],
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
      let grants = ctx.grants || [];
      let isAuthenticated = ctx.isAuthenticated;
      let isSuperAdmin = ctx.isSuperAdmin;

      if (logApiBaseUrl && !isSameOriginBase(logApiBaseUrl)) {
        try {
          const meRes = await fetchMe(logApiBaseUrl);
          if (meRes?.data) {
            user = meRes.data;
            grants = meRes.data.grants || [];
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
        grants,
        moduleAccess,
      });

      const moduleCapabilities = computeModuleCapabilitiesClient({
        channel: ctx.channel,
        deploymentRole: ctx.deploymentRole,
        isAuthenticated,
        isSuperAdmin,
        grants,
        visibleModules,
        moduleAccess,
      });

      setState({
        ...ctx,
        logApiBaseUrl,
        user,
        grants,
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

  const hasCapability = useCallback((
    capability: string,
    scope?: { scopeType: 'org' | 'project' | 'platform'; scopeId?: number },
    projectOrgId?: number | null,
  ) => {
    if (state.isSuperAdmin) return true;
    if (!state.isAuthenticated) return false;
    if (!scope) {
      return state.grants.some(g => g.capability === capability);
    }
    return state.grants.some(g =>
      g.capability === capability
      && matchScopeClient(g, scope.scopeType, scope.scopeId ?? 0, projectOrgId),
    );
  }, [state.isSuperAdmin, state.isAuthenticated, state.grants]);

  const canManageLog = useMemo(() => {
    if (state.isSuperAdmin) return true;
    return MODULE_WRITE_CAPS.log.some(cap => state.grants.some(g => g.capability === cap));
  }, [state.isSuperAdmin, state.grants]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    loading,
    refresh,
    canManageLog,
    hasCapability,
    hasModule: (key: string) => state.visibleModules.includes(key),
    canReadModule: (key: string) => !!state.moduleCapabilities[key]?.read,
    canWriteModule: (key: string) => !!state.moduleCapabilities[key]?.write,
  }), [state, loading, refresh, canManageLog, hasCapability]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
