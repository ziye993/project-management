import type { OrgPermission } from '../context/AuthContext';
import { normalizeModuleAccess, type ModuleAccessConfig } from '../constants/moduleAccess';

const LOCAL_MODULES = [
  'project', 'image', 'television', 'config', 'serverInfo', 'LANSharing',
  'swagger', 'dataMock', 'game', 'localChat', 'planeEditor', 'imageCrypto', 'calc', 'appStore',
];

const PUBLIC_ALWAYS = ['game', 'localChat'];
const PUBLIC_NEVER = ['project', 'config', 'dataMock', 'swagger', 'planeEditor', 'imageCrypto', 'calc'];

export function computeVisibleModulesClient(opts: {
  channel: string;
  deploymentRole: string;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  orgPermissions: OrgPermission[];
  moduleAccess?: ModuleAccessConfig | null;
}) {
  const { channel, deploymentRole, isAuthenticated, isSuperAdmin, orgPermissions } = opts;
  const access = normalizeModuleAccess(opts.moduleAccess);
  const hiddenSet = new Set(access.hidden);
  const hasOrg = orgPermissions.length > 0;

  // 超级管理员登录后开放全部功能（含公网下原 LOCAL_ONLY 模块）
  if (isAuthenticated && isSuperAdmin) {
    const modules = LOCAL_MODULES.filter(m => !hiddenSet.has(m));
    modules.push('log');
    if (deploymentRole === 'log_server') modules.push('auth');
    return modules;
  }

  if (channel === 'local' || channel === 'lan') {
    const modules = LOCAL_MODULES.filter(m => !hiddenSet.has(m));
    modules.push('log');
    if (deploymentRole === 'log_server') modules.push('auth');
    return modules;
  }

  const modules = [...PUBLIC_ALWAYS];
  if (!hiddenSet.has('appStore')) {
    modules.push('appStore');
  }
  if (isAuthenticated && hasOrg) {
    modules.push('log');
  } else {
    modules.push('log');
  }

  return modules.filter(m => !PUBLIC_NEVER.includes(m) && !hiddenSet.has(m));
}

export function computeModuleCapabilitiesClient(opts: {
  channel: string;
  deploymentRole: string;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  orgPermissions: OrgPermission[];
  visibleModules: string[];
  moduleAccess?: ModuleAccessConfig | null;
}) {
  const { channel, isAuthenticated, isSuperAdmin, orgPermissions, visibleModules } = opts;
  const caps: Record<string, { read: boolean; write: boolean }> = {};
  const hasManage = isSuperAdmin || orgPermissions.some(p => p.role === 'manage');
  const access = normalizeModuleAccess(opts.moduleAccess);
  const requireLoginSet = new Set(access.requireLogin);

  for (const key of visibleModules) {
    // 超级管理员对所有可见模块具备读写能力
    if (isAuthenticated && isSuperAdmin) {
      caps[key] = { read: true, write: true };
      continue;
    }

    if (channel === 'local' || channel === 'lan') {
      if (key === 'log') {
        caps[key] = isAuthenticated
          ? { read: true, write: hasManage }
          : { read: false, write: false };
      } else if (key === 'auth') {
        caps[key] = { read: true, write: true };
      } else if (requireLoginSet.has(key) && !isAuthenticated) {
        caps[key] = { read: false, write: false };
      } else {
        caps[key] = { read: true, write: true };
      }
      continue;
    }

    if (key === 'serverInfo') caps[key] = { read: true, write: false };
    else if (key === 'appStore') {
      caps[key] = { read: true, write: isAuthenticated };
    } else if (['image', 'television', 'LANSharing'].includes(key)) {
      caps[key] = { read: false, write: false };
    } else if (key === 'log') {
      caps[key] = isAuthenticated
        ? { read: true, write: hasManage }
        : { read: false, write: false };
    } else if (key === 'auth') {
      caps[key] = { read: false, write: false };
    } else if (requireLoginSet.has(key) && !isAuthenticated) {
      caps[key] = { read: false, write: false };
    } else {
      caps[key] = { read: true, write: true };
    }
  }

  return caps;
}
