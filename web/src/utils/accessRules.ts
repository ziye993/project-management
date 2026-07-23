import type { CapabilityGrant } from '../context/AuthContext';
import { normalizeModuleAccess, type ModuleAccessConfig } from '../constants/moduleAccess';
import { MODULE_WRITE_CAPS, MODULE_ENTRY_CAPS } from '../constants/capabilities';

const LOCAL_MODULES = [
  'project', 'image', 'television', 'config', 'serverInfo', 'LANSharing',
  'swagger', 'dataMock', 'game', 'localChat', 'planeEditor', 'imageCrypto', 'calc', 'appStore',
];

const PUBLIC_ALWAYS = ['game', 'localChat'];
const PUBLIC_NEVER = ['project', 'config', 'dataMock', 'swagger', 'planeEditor', 'imageCrypto', 'calc'];

/** 登录后仍默认可见（公开读 / 休闲），无需 module.*.access */
const AUTH_ALWAYS = ['game', 'localChat', 'appStore'];

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

function hasModuleEntry(moduleKey: string, grants: CapabilityGrant[], isSuperAdmin: boolean) {
  const caps = MODULE_ENTRY_CAPS[moduleKey];
  if (!caps) return false;
  return hasAnyCap(grants, caps, isSuperAdmin);
}

function hasAppStoreWrite(grants: CapabilityGrant[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return true;
  return grants.some(g =>
    g.capability === 'module.appStore.write'
    && g.scopeType === 'org'
    && Number(g.scopeId) === 0,
  );
}

/**
 * 未登录：按信道默认（局域网本地工具开放）。
 * 已登录超管：全开。
 * 已登录非超管：仅 AUTH_ALWAYS + 所持 MODULE_ENTRY_CAPS 对应模块。
 */
export function computeVisibleModulesClient(opts: {
  channel: string;
  deploymentRole: string;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  grants: CapabilityGrant[];
  moduleAccess?: ModuleAccessConfig | null;
}) {
  const { channel, deploymentRole, isAuthenticated, isSuperAdmin, grants } = opts;
  const access = normalizeModuleAccess(opts.moduleAccess);
  const guestHidden = !isAuthenticated ? new Set(access.hidden) : new Set<string>();

  if (isAuthenticated && isSuperAdmin) {
    return [...LOCAL_MODULES, 'log', 'auth'];
  }

  if (!isAuthenticated) {
    if (channel === 'local' || channel === 'lan') {
      const modules = LOCAL_MODULES.filter(m => !guestHidden.has(m));
      modules.push('log');
      if (deploymentRole === 'log_server') modules.push('auth');
      return modules;
    }
    const modules = [...PUBLIC_ALWAYS];
    if (!guestHidden.has('appStore')) modules.push('appStore');
    if (!guestHidden.has('log')) modules.push('log');
    return modules.filter(m => !PUBLIC_NEVER.includes(m) && !guestHidden.has(m));
  }

  // authenticated non-super：能力驱动
  const modules = new Set<string>(AUTH_ALWAYS);

  for (const key of LOCAL_MODULES) {
    if (AUTH_ALWAYS.includes(key)) continue;
    if (hasModuleEntry(key, grants, false)) modules.add(key);
  }
  if (hasModuleEntry('log', grants, false)) modules.add('log');
  if (hasModuleEntry('auth', grants, false)) modules.add('auth');

  return [...modules];
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
  const requireLoginSet = !isAuthenticated ? new Set(access.requireLogin) : new Set<string>();

  for (const key of visibleModules) {
    if (isAuthenticated && isSuperAdmin) {
      caps[key] = { read: true, write: true };
      continue;
    }

    if (!isAuthenticated) {
      if (requireLoginSet.has(key)) {
        caps[key] = { read: false, write: false };
      } else if (key === 'log' || key === 'auth') {
        caps[key] = { read: false, write: false };
      } else {
        caps[key] = { read: true, write: true };
      }
      continue;
    }

    // authenticated non-super
    if (key === 'log') {
      caps[key] = {
        read: hasModuleEntry('log', grants, false),
        write: hasAnyCap(grants, MODULE_WRITE_CAPS.log, false),
      };
    } else if (key === 'auth') {
      caps[key] = {
        read: hasModuleEntry('auth', grants, false),
        write: hasAnyCap(grants, MODULE_WRITE_CAPS.auth, false),
      };
    } else if (key === 'appStore') {
      caps[key] = {
        read: true,
        write: hasAppStoreWrite(grants, false),
      };
    } else if (MODULE_ENTRY_CAPS[key]) {
      const ok = hasModuleEntry(key, grants, false);
      caps[key] = { read: ok, write: ok };
    } else {
      caps[key] = { read: true, write: true };
    }
  }

  void channel;
  return caps;
}
