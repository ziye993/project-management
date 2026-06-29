import jwt from 'jsonwebtoken';
import pool from '../db/logDb.js';
import { JWT_SECRET } from '../config/deployment.js';
import { isLogServerTrusted, getClientIp } from './access.js';

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function loadUserPermissions(userId) {
  const [orgRows] = await pool.execute(
    `SELECT uo.org_id AS orgId, uo.role, o.org_name AS orgName
     FROM sys_user_org uo
     LEFT JOIN sys_org o ON o.id = uo.org_id
     WHERE uo.user_id = ?`,
    [userId],
  );

  const [projectRows] = await pool.execute(
    `SELECT up.project_id AS projectId, up.role, p.org_id AS orgId, p.project_name AS projectName
     FROM sys_user_project up
     LEFT JOIN sys_project p ON p.id = up.project_id
     WHERE up.user_id = ?`,
    [userId],
  );

  return { orgPermissions: orgRows, projectPermissions: projectRows };
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

  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    is_super_admin: !!user.is_super_admin,
  };

  const perms = await loadUserPermissions(user.id);
  req.orgPermissions = perms.orgPermissions;
  req.projectPermissions = perms.projectPermissions;
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
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        is_super_admin: !!user.is_super_admin,
      };
      const perms = await loadUserPermissions(user.id);
      req.orgPermissions = perms.orgPermissions;
      req.projectPermissions = perms.projectPermissions;
    }
    next();
  }).catch(() => next());
}

export function isEffectiveSuperAdmin(req) {
  if (req.user?.is_super_admin) return true;
  if (isLogServerTrusted(req) && req.path?.startsWith('/api/auth')) return true;
  return false;
}

export function requireSuperAdmin(req, res, next) {
  if (isEffectiveSuperAdmin(req) || isLogServerTrusted(req)) {
    return next();
  }
  return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '需要超级管理员权限', data: null });
}

export function requireRealSuperAdmin(req, res, next) {
  if (req.user?.is_super_admin) return next();
  return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '需要超级管理员权限', data: null });
}

function roleLevel(role) {
  return role === 'manage' ? 2 : 1;
}

export function hasOrgPermission(req, orgId, level = 'view') {
  if (req.user?.is_super_admin) return true;
  const need = roleLevel(level);
  const orgPerm = req.orgPermissions?.find(p => Number(p.orgId) === Number(orgId));
  if (orgPerm && roleLevel(orgPerm.role) >= need) return true;
  const projectPerm = req.projectPermissions?.find(p => Number(p.orgId) === Number(orgId));
  if (projectPerm && roleLevel(projectPerm.role) >= need) return true;
  return false;
}

export function hasProjectPermission(req, projectId, orgId, level = 'view') {
  if (req.user?.is_super_admin) return true;
  const need = roleLevel(level);
  const projectPerm = req.projectPermissions?.find(p => Number(p.projectId) === Number(projectId));
  if (projectPerm && roleLevel(projectPerm.role) >= need) return true;
  if (orgId != null) {
    const orgPerm = req.orgPermissions?.find(p => Number(p.orgId) === Number(orgId));
    if (orgPerm && roleLevel(orgPerm.role) >= need) return true;
  }
  return false;
}

export function requireOrgPermission(level = 'view') {
  return async (req, res, next) => {
    if (req.user?.is_super_admin) return next();

    const orgId = req.body?.orgId ?? req.body?.org_id ?? req.body?.id;
    const projectId = req.body?.projectId ?? req.body?.project_id;

    if (projectId) {
      let resolvedOrgId = orgId;
      if (!resolvedOrgId) {
        const [rows] = await pool.execute('SELECT org_id FROM sys_project WHERE id = ?', [projectId]);
        resolvedOrgId = rows[0]?.org_id;
      }
      if (hasProjectPermission(req, projectId, resolvedOrgId, level)) return next();
    } else if (orgId) {
      if (hasOrgPermission(req, orgId, level)) return next();
    } else if (level === 'view') {
      return next();
    }

    return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '权限不足', data: null });
  };
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

  const path = req.path || req.url?.split('?')[0] || '';

  if (path === '/api/system/getServerStatus') {
    if (req.user?.is_super_admin) return next();
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
