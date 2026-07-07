import type { OrgPermission } from '../context/AuthContext';
import { normalizeModuleAccess, type ModuleAccessConfig } from '../constants/moduleAccess';

const LOCAL_MODULES = [
  'project', 'image', 'television', 'config', 'serverInfo', 'LANSharing',
  'swagger', 'dataMock', 'game', 'localChat', 'planeEditor',
];

const PUBLIC_ALWAYS = ['game', 'localChat'];
const PUBLIC_NEVER = ['project', 'config', 'dataMock', 'swagger', 'planeEditor'];

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

  if (channel === 'local' || channel === 'lan') {
    const modules = LOCAL_MODULES.filter(m => !hiddenSet.has(m));
    modules.push('log');
    if (deploymentRole === 'log_server') modules.push('auth');
    return modules;
  }

  const modules = [...PUBLIC_ALWAYS];
  if (isAuthenticated && isSuperAdmin) {
    modules.push('serverInfo', 'image', 'television', 'LANSharing', 'log');
    if (deploymentRole === 'log_server') modules.push('auth');
  } else if (isAuthenticated && hasOrg) {
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
  const { channel, deploymentRole, isAuthenticated, isSuperAdmin, orgPermissions, visibleModules } = opts;
  const caps: Record<string, { read: boolean; write: boolean }> = {};
  const hasManage = isSuperAdmin || orgPermissions.some(p => p.role === 'manage');
  const access = normalizeModuleAccess(opts.moduleAccess);
  const requireLoginSet = new Set(access.requireLogin);

  for (const key of visibleModules) {
    if (channel === 'local' || channel === 'lan') {
      if (key === 'log') {
        caps[key] = isAuthenticated
          ? { read: true, write: isSuperAdmin || hasManage }
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
    else if (['image', 'television', 'LANSharing'].includes(key)) {
      caps[key] = isSuperAdmin ? { read: true, write: true } : { read: false, write: false };
    } else if (key === 'log') {
      caps[key] = isAuthenticated
        ? { read: true, write: isSuperAdmin || hasManage }
        : { read: false, write: false };
    } else if (key === 'auth') {
      caps[key] = deploymentRole === 'log_server' && isSuperAdmin
        ? { read: true, write: true }
        : { read: false, write: false };
    } else if (requireLoginSet.has(key) && !isAuthenticated) {
      caps[key] = { read: false, write: false };
    } else {
      caps[key] = { read: true, write: true };
    }
  }

  return caps;
}
