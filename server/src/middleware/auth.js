import jwt from 'jsonwebtoken';
import pool from '../db/logDb.js';
import { JWT_SECRET } from '../config/deployment.js';
import { getClientIp } from './access.js';
import { loadUserGrants } from '../auth/grants.js';

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/** @deprecated 使用 loadUserGrants；保留别名避免漏改 */
export async function loadUserPermissions(userId) {
  const grants = await loadUserGrants(userId);
  return { grants };
}

async function attachUserAndGrants(req, user) {
  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    is_super_admin: !!user.is_super_admin,
  };
  req.grants = await loadUserGrants(user.id);
}

export async function authenticateToken(req, res, next) {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, code: 'NOT_TOKEN', msg: '未提供令牌', data: null });
  }

  const payload = verifyToken(token);
  if (!payload?.id) {
    return res.status(403).json({ success: false, code: 'INVALID_TOKEN', msg: '无效令牌', data: null });
  }

  const [rows] = await pool.execute(
    'SELECT id, username, email, status, is_super_admin FROM sys_user WHERE id = ?',
    [payload.id],
  );
  const user = rows[0];
  if (!user || user.status !== 1) {
    return res.status(403).json({ success: false, code: 'INVALID_USER', msg: '用户不存在或已禁用', data: null });
  }

  await attachUserAndGrants(req, user);
  next();
}

export function optionalAuthenticate(req, _res, next) {
  const token = req?.cookies?.token;
  if (!token) return next();

  const payload = verifyToken(token);
  if (!payload?.id) return next();

  pool.execute(
    'SELECT id, username, email, status, is_super_admin FROM sys_user WHERE id = ?',
    [payload.id],
  ).then(async ([rows]) => {
    const user = rows[0];
    if (user && user.status === 1) {
      await attachUserAndGrants(req, user);
    }
    next();
  }).catch(() => next());
}

/** 仅登录的平台超管；局域网访客不再放行 */
export function requireSuperAdmin(req, res, next) {
  if (req.user?.is_super_admin) return next();
  if (!req.user) {
    return res.status(401).json({ success: false, code: 'NOT_TOKEN', msg: '未登录', data: null });
  }
  return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '需要超级管理员权限', data: null });
}

export function requireRealSuperAdmin(req, res, next) {
  if (req.user?.is_super_admin) return next();
  if (!req.user) {
    return res.status(401).json({ success: false, code: 'NOT_TOKEN', msg: '未登录', data: null });
  }
  return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '需要超级管理员权限', data: null });
}

const LOCAL_ONLY_PREFIXES = [
  '/api/project',
  '/api/config',
  '/api/mock',
  '/openapi-proxy',
  '/openapi-api-proxy',
  '/api/system/shutdown',
];

export function blockPublicLocalOnly(req, res, next) {
  if (req.channel !== 'public') return next();
  if (req.user?.is_super_admin) return next();

  const path = req.path || req.url?.split('?')[0] || '';

  if (path === '/api/system/getServerStatus') {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '无权访问', data: null });
  }

  for (const prefix of LOCAL_ONLY_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '公网禁止访问', data: null });
    }
  }

  next();
}

const MEDIA_WRITE_PATHS = [
  '/api/upload/uploadPic',
  '/api/upload/uploadMov',
  '/api/upload/uploadFile',
  '/api/upload/chunkInit',
  '/api/upload/chunk',
  '/api/upload/chunkMerge',
  '/api/file/deleteMedia',
  '/api/share/mkdir',
  '/api/share/upload',
  '/api/share/delete',
];

export function blockPublicMediaWrite(req, res, next) {
  if (req.channel !== 'public') return next();
  if (req.user?.is_super_admin) return next();

  const path = req.path || req.url?.split('?')[0] || '';
  if (MEDIA_WRITE_PATHS.some(p => path === p || path.startsWith(p))) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '公网禁止写入', data: null });
  }

  next();
}

export async function auditLog(req, action, targetType, targetId, detail = null) {
  try {
    await pool.execute(
      `INSERT INTO sys_audit_log (user_id, username, action, target_type, target_id, detail, client_ip, channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.id || null,
        req.user?.username || null,
        action,
        targetType,
        targetId != null ? String(targetId) : null,
        detail ? JSON.stringify(detail) : null,
        getClientIp(req),
        req.channel || null,
      ],
    );
  } catch (err) {
    console.error('[auditLog]', err);
  }
}
