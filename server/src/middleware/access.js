import { isIPv4, isIPv6 } from 'node:net';
import { DEPLOYMENT_ROLE } from '../config/deployment.js';
import {
  MODULE_WRITE_CAPS,
  MODULE_ENTRY_CAPS,
} from '../auth/capabilities.js';
import { hasAnyCapability, hasCapability } from '../auth/grants.js';

const LOCAL_MODULES = [
  'project', 'image', 'television', 'config', 'serverInfo', 'LANSharing',
  'swagger', 'dataMock', 'game', 'localChat', 'planeEditor', 'imageCrypto', 'calc',
  'appStore',
];

const CONFIGURABLE_MODULE_KEYS = new Set(LOCAL_MODULES);

const PUBLIC_ALWAYS = ['game', 'localChat'];
const PUBLIC_NEVER = ['project', 'config', 'dataMock', 'swagger', 'planeEditor', 'imageCrypto', 'calc'];
/** 登录后仍默认可见，无需 module.*.access */
const AUTH_ALWAYS = ['game', 'localChat', 'appStore'];

export function normalizeModuleAccess(raw) {
  const requireLogin = [];
  const hidden = [];

  if (Array.isArray(raw?.requireLogin)) {
    for (const key of raw.requireLogin) {
      if (typeof key === 'string' && CONFIGURABLE_MODULE_KEYS.has(key) && !hidden.includes(key)) {
        requireLogin.push(key);
      }
    }
  }
  if (Array.isArray(raw?.hidden)) {
    for (const key of raw.hidden) {
      if (typeof key === 'string' && CONFIGURABLE_MODULE_KEYS.has(key) && !hidden.includes(key)) {
        hidden.push(key);
      }
    }
  }

  return {
    requireLogin: requireLogin.filter(key => !hidden.includes(key)),
    hidden,
  };
}

function normalizeIp(raw) {
  if (!raw) return '';
  let ip = String(raw).trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

export function getClientIp(req) {
  const realIp = req.headers['x-real-ip'];
  if (realIp) return normalizeIp(realIp);

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return normalizeIp(first);
  }

  return normalizeIp(req.socket?.remoteAddress || req.ip || '');
}

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  return false;
}

function isPrivateIpv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe80')) return true;
  return false;
}

export function resolveChannel(ip) {
  const normalized = normalizeIp(ip);
  if (normalized === '127.0.0.1') return 'local';
  if (isIPv4(normalized)) {
    if (normalized === '127.0.0.1' || isPrivateIpv4(normalized)) {
      return normalized === '127.0.0.1' ? 'local' : 'lan';
    }
    return 'public';
  }
  if (isIPv6(normalized)) {
    if (normalized === '::1') return 'local';
    if (isPrivateIpv6(normalized)) return 'lan';
    return 'public';
  }
  return 'public';
}

export function isLogServerTrusted(req) {
  const channel = req.channel || resolveChannel(getClientIp(req));
  return (channel === 'local' || channel === 'lan') && DEPLOYMENT_ROLE === 'log_server';
}

export function isLocalAgentTrusted(req) {
  const channel = req.channel || resolveChannel(getClientIp(req));
  return channel === 'local' || channel === 'lan';
}

function asUser(isSuperAdmin) {
  return { is_super_admin: !!isSuperAdmin };
}

function hasModuleEntry(moduleKey, isSuperAdmin, grants) {
  const caps = MODULE_ENTRY_CAPS[moduleKey];
  if (!caps) return false;
  return hasAnyCapability(asUser(isSuperAdmin), grants || [], caps);
}

/**
 * moduleAccess.hidden / requireLogin 仅约束未登录用户。
 * 已登录超管：全开。
 * 已登录非超管：AUTH_ALWAYS + MODULE_ENTRY_CAPS（含 module.*.access）。
 * 未登录：按信道默认（局域网本地工具开放）。
 */
export function computeVisibleModules({
  channel,
  deploymentRole,
  isAuthenticated,
  isSuperAdmin,
  grants,
  moduleAccess,
}) {
  const access = normalizeModuleAccess(moduleAccess);
  const guestHidden = (!isAuthenticated ? new Set(access.hidden) : new Set());

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

  const modules = new Set(AUTH_ALWAYS);
  for (const key of LOCAL_MODULES) {
    if (AUTH_ALWAYS.includes(key)) continue;
    if (hasModuleEntry(key, false, grants)) modules.add(key);
  }
  if (hasModuleEntry('log', false, grants)) modules.add('log');
  if (hasModuleEntry('auth', false, grants)) modules.add('auth');
  return [...modules];
}

function rw(read = true, write = true) {
  return { read, write };
}

function moduleWriteFromGrants(moduleKey, isSuperAdmin, grants) {
  const caps = MODULE_WRITE_CAPS[moduleKey];
  if (!caps) return false;
  const user = asUser(isSuperAdmin);
  if (moduleKey === 'appStore') {
    return hasCapability(
      user,
      'module.appStore.write',
      { scopeType: 'platform', scopeId: 0 },
      grants,
    );
  }
  return hasAnyCapability(user, grants, caps);
}

export function computeModuleCapabilities({
  channel,
  deploymentRole,
  isAuthenticated,
  isSuperAdmin,
  grants,
  visibleModules,
  moduleAccess,
}) {
  const caps = {};
  const access = normalizeModuleAccess(moduleAccess);
  const requireLoginSet = !isAuthenticated ? new Set(access.requireLogin) : new Set();
  const grantList = grants || [];

  for (const key of visibleModules) {
    if (isAuthenticated && isSuperAdmin) {
      caps[key] = rw(true, true);
      continue;
    }

    if (!isAuthenticated) {
      if (requireLoginSet.has(key) || key === 'log' || key === 'auth') {
        caps[key] = rw(false, false);
      } else {
        caps[key] = rw(true, true);
      }
      continue;
    }

    if (key === 'log') {
      caps[key] = rw(
        hasModuleEntry('log', false, grantList),
        moduleWriteFromGrants('log', false, grantList),
      );
    } else if (key === 'auth') {
      caps[key] = rw(
        hasModuleEntry('auth', false, grantList),
        moduleWriteFromGrants('auth', false, grantList),
      );
    } else if (key === 'appStore') {
      caps[key] = rw(true, moduleWriteFromGrants('appStore', false, grantList));
    } else if (MODULE_ENTRY_CAPS[key]) {
      const ok = hasModuleEntry(key, false, grantList);
      caps[key] = rw(ok, ok);
    } else {
      caps[key] = rw(true, true);
    }
  }

  void channel;
  void deploymentRole;
  return caps;
}

export function attachAccessMeta(req, _res, next) {
  const ip = getClientIp(req);
  req.clientIp = ip;
  req.channel = resolveChannel(ip);
  req.deploymentRole = DEPLOYMENT_ROLE;
  next();
}

export { LOCAL_MODULES, PUBLIC_ALWAYS, PUBLIC_NEVER };
