import type { CapabilityGrant } from '../context/AuthContext';
import { normalizeModuleAccess, type ModuleAccessConfig } from '../constants/moduleAccess';
import { MODULE_WRITE_CAPS, MODULE_READ_CAPS } from '../constants/capabilities';

const LOCAL_MODULES = [
  'project', 'image', 'television', 'config', 'serverInfo', 'LANSharing',
  'swagger', 'dataMock', 'game', 'localChat', 'planeEditor', 'imageCrypto', 'calc', 'appStore',
];

const PUBLIC_ALWAYS = ['game', 'localChat'];
const PUBLIC_NEVER = ['project', 'config', 'dataMock', 'swagger', 'planeEditor', 'imageCrypto', 'calc'];

export function matchScopeClient(
  grant: CapabilityGrant,
  needType: string,
  needId: number,
  projectOrgId?: number | null,
) {
  if (needType === 'platform') {
    return grant.scopeType === 'org' && Number(grant.scopeId) === 0;
  }
  if (needType === 'org') {
    return grant.scopeType === 'org' && Number(grant.scopeId) === Number(needId);
  }
  if (needType === 'project') {
    if (grant.scopeType === 'project' && Number(grant.scopeId) === Number(needId)) return true;
    if (grant.scopeType === 'org' && projectOrgId != null
        && Number(grant.scopeId) === Number(projectOrgId)) return true;
  }
  return false;
}

function hasAnyCap(grants: CapabilityGrant[], caps: string[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return true;
  const set = new Set(caps);
  return grants.some(g => set.has(g.capability));
}

function hasAppStoreWrite(grants: CapabilityGrant[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return true;
  return grants.some(g =>
    g.capability === 'module.appStore.write'
    && g.scopeType === 'org'
    && Number(g.scopeId) === 0,
  );
}

export function computeVisibleModulesClient(opts: {
  channel: string;
  deploymentRole: string;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  grants: CapabilityGrant[];
  moduleAccess?: ModuleAccessConfig | null;
}) {
  const { channel, deploymentRole, isAuthenticated, isSuperAdmin } = opts;
  const access = normalizeModuleAccess(opts.moduleAccess);
  const hiddenSet = new Set(access.hidden);

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
  modules.push('log');

  return modules.filter(m => !PUBLIC_NEVER.includes(m) && !hiddenSet.has(m));
}

export function computeModuleCapabilitiesClient(opts: {
  channel: string;
  deploymentRole: string;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  grants: CapabilityGrant[];
  visibleModules: string[];
  moduleAccess?: ModuleAccessConfig | null;
}) {
  const { channel, isAuthenticated, isSuperAdmin, grants, visibleModules } = opts;
  const caps: Record<string, { read: boolean; write: boolean }> = {};
  const access = normalizeModuleAccess(opts.moduleAccess);
  const requireLoginSet = new Set(access.requireLogin);

  for (const key of visibleModules) {
    if (isAuthenticated && isSuperAdmin) {
      caps[key] = { read: true, write: true };
      continue;
    }

    if (channel === 'local' || channel === 'lan') {
      if (key === 'log') {
        caps[key] = isAuthenticated
          ? {
            read: true,
            write: hasAnyCap(grants, MODULE_WRITE_CAPS.log, false),
          }
          : { read: false, write: false };
      } else if (key === 'auth') {
        caps[key] = isAuthenticated
          ? {
            read: hasAnyCap(grants, MODULE_READ_CAPS.auth, false),
            write: hasAnyCap(grants, MODULE_WRITE_CAPS.auth, false),
          }
          : { read: false, write: false };
      } else if (key === 'appStore') {
        caps[key] = {
          read: true,
          write: isAuthenticated && hasAppStoreWrite(grants, false),
        };
      } else if (requireLoginSet.has(key) && !isAuthenticated) {
        caps[key] = { read: false, write: false };
      } else {
        caps[key] = { read: true, write: true };
      }
      continue;
    }

    if (key === 'serverInfo') caps[key] = { read: true, write: false };
    else if (key === 'appStore') {
      caps[key] = {
        read: true,
        write: isAuthenticated && hasAppStoreWrite(grants, false),
      };
    } else if (['image', 'television', 'LANSharing'].includes(key)) {
      caps[key] = { read: false, write: false };
    } else if (key === 'log') {
      caps[key] = isAuthenticated
        ? {
          read: true,
          write: hasAnyCap(grants, MODULE_WRITE_CAPS.log, false),
        }
        : { read: false, write: false };
    } else if (key === 'auth') {
      caps[key] = isAuthenticated
        ? {
          read: hasAnyCap(grants, MODULE_READ_CAPS.auth, false),
          write: hasAnyCap(grants, MODULE_WRITE_CAPS.auth, false),
        }
        : { read: false, write: false };
    } else if (requireLoginSet.has(key) && !isAuthenticated) {
      caps[key] = { read: false, write: false };
    } else {
      caps[key] = { read: true, write: true };
    }
  }

  return caps;
}
