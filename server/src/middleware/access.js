import { isIPv4, isIPv6 } from 'node:net';
import { DEPLOYMENT_ROLE } from '../config/deployment.js';

const LOCAL_MODULES = [
  'project', 'image', 'television', 'config', 'serverInfo', 'LANSharing',
  'swagger', 'dataMock', 'game', 'localChat', 'planeEditor', 'imageCrypto', 'calc',
];

const CONFIGURABLE_MODULE_KEYS = new Set(LOCAL_MODULES);

const PUBLIC_ALWAYS = ['game', 'localChat'];
const PUBLIC_NEVER = ['project', 'config', 'dataMock', 'swagger', 'planeEditor', 'imageCrypto', 'calc'];

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

export function computeVisibleModules({
  channel,
  deploymentRole,
  isAuthenticated,
  isSuperAdmin,
  orgPermissions,
  moduleAccess,
}) {
  const hasOrg = Array.isArray(orgPermissions) && orgPermissions.length > 0;
  const access = normalizeModuleAccess(moduleAccess);
  const hiddenSet = new Set(access.hidden);

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
  if (isAuthenticated && hasOrg) {
    modules.push('log');
  } else {
    modules.push('log');
  }

  return modules.filter(m => !PUBLIC_NEVER.includes(m) && !hiddenSet.has(m));
}

function rw(read = true, write = true) {
  return { read, write };
}

export function computeModuleCapabilities({
  channel,
  deploymentRole,
  isAuthenticated,
  isSuperAdmin,
  orgPermissions,
  visibleModules,
  moduleAccess,
}) {
  const caps = {};
  const hasOrg = Array.isArray(orgPermissions) && orgPermissions.length > 0;
  const hasManage = isSuperAdmin || orgPermissions?.some(p => p.role === 'manage');
  const access = normalizeModuleAccess(moduleAccess);
  const requireLoginSet = new Set(access.requireLogin);

  for (const key of visibleModules) {
    // 超级管理员对所有可见模块具备读写能力
    if (isAuthenticated && isSuperAdmin) {
      caps[key] = rw(true, true);
      continue;
    }

    if (channel === 'local' || channel === 'lan') {
      if (key === 'log') {
        caps[key] = isAuthenticated
          ? rw(true, hasManage)
          : rw(false, false);
      } else if (key === 'auth') {
        caps[key] = rw(true, true);
      } else if (requireLoginSet.has(key) && !isAuthenticated) {
        caps[key] = rw(false, false);
      } else {
        caps[key] = rw(true, true);
      }
      continue;
    }

    if (key === 'serverInfo') {
      caps[key] = rw(true, false);
    } else if (['image', 'television', 'LANSharing'].includes(key)) {
      caps[key] = rw(false, false);
    } else if (key === 'log') {
      caps[key] = isAuthenticated
        ? rw(true, hasManage)
        : rw(false, false);
    } else if (key === 'auth') {
      caps[key] = rw(false, false);
    } else if (requireLoginSet.has(key) && !isAuthenticated) {
      caps[key] = rw(false, false);
    } else {
      caps[key] = rw(true, true);
    }
  }

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
