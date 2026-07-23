import bcrypt from 'bcrypt';
import pool from '../../db/logDb.js';
import { auditLog } from '../../middleware/auth.js';
import {
  listCapabilityCatalog,
  MODULE_WRITE_CAPS,
} from '../../auth/capabilities.js';
import {
  loadUserGrants,
  insertGrant,
  deleteGrantById,
  deleteGrantByKeys,
  getGrantById,
  canGrantCapability,
  canRevokeGrant,
  isKnownCapability,
  normalizeScopeForCapability,
  hasAnyCapability,
  getOrgIdsWithCapability,
  resolveProjectOrgId,
  hasCapability,
} from '../../auth/grants.js';

function fail(res, status, code, msg) {
  return res.status(status).json({ success: false, code, msg, data: null });
}

function ok(res, data, msg = '') {
  return res.json({ success: true, code: 0, msg, data });
}

function canManageUsers(req) {
  if (req.user?.is_super_admin) return true;
  return hasAnyCapability(req.user, req.grants, [
    'auth.user.create', 'auth.user.update', 'auth.grant', 'auth.grant.list',
  ]);
}

export async function listUsers(req, res) {
  try {
    if (!canManageUsers(req)) return fail(res, 403, 2, '权限不足');

    const { username, status, page = 1, pageSize = 20 } = req.body || {};
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const conditions = [];
    const params = [];
    if (username) {
      conditions.push('username LIKE ?');
      params.push(`%${username}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      conditions.push('status = ?');
      params.push(parseInt(status, 10));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM sys_user ${where}`,
      params,
    );

    const [rows] = await pool.execute(
      `SELECT id, username, email, status, is_super_admin, create_time, update_time
       FROM sys_user ${where}
       ORDER BY id DESC
       LIMIT ${ps} OFFSET ${offset}`,
      params,
    );

    ok(res, { list: rows, total: countRows[0].total, page: p, pageSize: ps });
  } catch (err) {
    console.error('[auth/user/list]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function createUser(req, res) {
  try {
    const canCreate = req.user?.is_super_admin
      || hasAnyCapability(req.user, req.grants, ['auth.user.create']);
    if (!canCreate) return fail(res, 403, 2, '权限不足');

    const { username, password, email } = req.body || {};
    if (!username?.trim() || !password) {
      return fail(res, 400, 1, '用户名和密码必填');
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO sys_user (username, password_hash, email) VALUES (?, ?, ?)',
      [username.trim(), hash, email || null],
    );

    await auditLog(req, 'user.create', 'user', result.insertId, { username });
    ok(res, { id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 400, 1, '用户名已存在');
    }
    console.error('[auth/user/create]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function updateUser(req, res) {
  try {
    const canUpdate = req.user?.is_super_admin
      || hasAnyCapability(req.user, req.grants, ['auth.user.update']);
    if (!canUpdate) return fail(res, 403, 2, '权限不足');

    const { id, email, status, is_super_admin } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id');

    if (is_super_admin !== undefined && !req.user?.is_super_admin) {
      return fail(res, 403, 2, '禁止非超管修改 is_super_admin');
    }

    if (is_super_admin !== undefined && req.user?.is_super_admin) {
      await pool.execute(
        'UPDATE sys_user SET email = ?, status = ?, is_super_admin = ? WHERE id = ?',
        [
          email ?? null,
          status !== undefined ? parseInt(status, 10) : 1,
          is_super_admin ? 1 : 0,
          id,
        ],
      );
    } else {
      const [result] = await pool.execute(
        'UPDATE sys_user SET email = ?, status = ? WHERE id = ?',
        [email ?? null, status !== undefined ? parseInt(status, 10) : 1, id],
      );
      if (!result.affectedRows) return fail(res, 400, 1, '用户不存在');
    }

    await auditLog(req, 'user.update', 'user', id, { email, status, is_super_admin });
    ok(res, { id });
  } catch (err) {
    console.error('[auth/user/update]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function resetPassword(req, res) {
  try {
    const canUpdate = req.user?.is_super_admin
      || hasAnyCapability(req.user, req.grants, ['auth.user.update']);
    if (!canUpdate) return fail(res, 403, 2, '权限不足');

    const { id, password } = req.body || {};
    if (!id || !password) return fail(res, 400, 1, '缺少参数');

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'UPDATE sys_user SET password_hash = ? WHERE id = ?',
      [hash, id],
    );
    if (!result.affectedRows) return fail(res, 400, 1, '用户不存在');

    await auditLog(req, 'user.resetPassword', 'user', id);
    ok(res, { id });
  } catch (err) {
    console.error('[auth/user/resetPassword]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function capabilityCatalog(req, res) {
  try {
    if (!req.user) return fail(res, 401, 'NOT_TOKEN', '未登录');

    const catalog = listCapabilityCatalog();
    if (req.user.is_super_admin) {
      return ok(res, { list: catalog });
    }

    // 仅返回操作者持有且可再授权的能力
    const delegable = new Set(
      (req.grants || [])
        .filter(g => g.canDelegate)
        .map(g => g.capability),
    );
    ok(res, { list: catalog.filter(c => delegable.has(c.id)) });
  } catch (err) {
    console.error('[auth/capability/catalog]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function capabilityMine(req, res) {
  try {
    if (!req.user) return fail(res, 401, 'NOT_TOKEN', '未登录');
    const grants = await loadUserGrants(req.user.id);
    ok(res, { grants });
  } catch (err) {
    console.error('[auth/capability/mine]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function capabilityListByUser(req, res) {
  try {
    if (!req.user) return fail(res, 401, 'NOT_TOKEN', '未登录');
    const userId = Number(req.body?.userId);
    if (!userId) return fail(res, 400, 1, '缺少 userId');

    const isSelf = Number(req.user.id) === userId;
    const canList = req.user.is_super_admin
      || isSelf
      || hasAnyCapability(req.user, req.grants, ['auth.grant.list', 'auth.grant']);
    if (!canList) return fail(res, 403, 2, '权限不足');

    const grants = await loadUserGrants(userId);
    ok(res, { grants });
  } catch (err) {
    console.error('[auth/capability/listByUser]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function capabilityGrant(req, res) {
  try {
    if (!req.user) return fail(res, 401, 'NOT_TOKEN', '未登录');

    const {
      userId,
      capability,
      scopeType,
      scopeId,
      canDelegate,
      canRevokePeer,
    } = req.body || {};

    if (!userId || !capability) return fail(res, 400, 1, '缺少参数');
    if (!isKnownCapability(capability)) return fail(res, 400, 1, '未知能力');

    const normalized = normalizeScopeForCapability(capability, scopeType, scopeId);
    if (!normalized.ok) return fail(res, 400, 1, normalized.error);

    // 需要 auth.grant（平台级 appStore 写由超管或持有者授；仍要求 auth.grant 在某 org，超管除外）
    if (!req.user.is_super_admin) {
      const hasGrantCap = hasAnyCapability(req.user, req.grants, ['auth.grant']);
      if (!hasGrantCap && capability !== 'module.appStore.write') {
        return fail(res, 403, 2, '缺少 auth.grant 能力');
      }
      // module.appStore.write：持有可再授权即可授（通常仅超管持有）
      if (capability === 'module.appStore.write') {
        const hold = hasCapability(
          req.user,
          'module.appStore.write',
          { scopeType: 'platform', scopeId: 0 },
          req.grants,
        );
        if (!hold) return fail(res, 403, 2, '无权授出应用商店写能力');
      }
    }

    let projectOrgId = null;
    if (normalized.scopeType === 'project') {
      projectOrgId = await resolveProjectOrgId(normalized.scopeId);
      if (projectOrgId == null) return fail(res, 400, 1, '项目不存在');
    }

    const check = canGrantCapability(req.user, req.grants, {
      capability,
      scopeType: normalized.scopeType,
      scopeId: normalized.scopeId,
      canDelegate,
      canRevokePeer,
      projectOrgId,
    });
    if (!check.ok) return fail(res, 403, 2, check.error);

    // 对 org 级授权，非超管还需在该 org 持有 auth.grant
    if (!req.user.is_super_admin && normalized.scopeType === 'org' && normalized.scopeId !== 0) {
      const okAuth = hasCapability(
        req.user,
        'auth.grant',
        { scopeType: 'org', scopeId: normalized.scopeId },
        req.grants,
      );
      if (!okAuth && capability !== 'module.appStore.write') {
        return fail(res, 403, 2, '无权在该租户下授权');
      }
    }
    if (!req.user.is_super_admin && normalized.scopeType === 'project') {
      const okAuth = hasCapability(
        req.user,
        'auth.grant',
        { scopeType: 'org', scopeId: projectOrgId },
        req.grants,
      );
      if (!okAuth) return fail(res, 403, 2, '无权在该租户下授权');
    }

    const [userRows] = await pool.execute('SELECT id FROM sys_user WHERE id = ?', [userId]);
    if (!userRows.length) return fail(res, 400, 1, '用户不存在');

    await insertGrant({
      userId,
      capability,
      scopeType: normalized.scopeType,
      scopeId: normalized.scopeId,
      canDelegate: check.flags.can_delegate,
      canRevokePeer: check.flags.can_revoke_peer,
      grantedBy: req.user.id,
      grantSource: 'manual',
    });

    await auditLog(req, 'grant.capability', 'capability', `${userId}:${capability}`, {
      capability,
      scopeType: normalized.scopeType,
      scopeId: normalized.scopeId,
      canDelegate: check.flags.can_delegate,
      canRevokePeer: check.flags.can_revoke_peer,
      toUserId: userId,
    });

    ok(res, null);
  } catch (err) {
    console.error('[auth/capability/grant]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function capabilityRevoke(req, res) {
  try {
    if (!req.user) return fail(res, 401, 'NOT_TOKEN', '未登录');

    const { grantId, userId, capability, scopeType, scopeId } = req.body || {};

    let target = null;
    if (grantId) {
      target = await getGrantById(grantId);
    } else if (userId && capability && scopeType != null && scopeId != null) {
      const grants = await loadUserGrants(userId);
      target = grants.find(g =>
        g.capability === capability
        && g.scopeType === scopeType
        && Number(g.scopeId) === Number(scopeId),
      ) || null;
    } else {
      return fail(res, 400, 1, '缺少 grantId 或完整定位参数');
    }

    if (!target) return fail(res, 400, 1, '授权不存在');

    const check = canRevokeGrant(req.user, req.grants, target);
    if (!check.ok) return fail(res, 403, 2, check.error);

    // 收回他人时还需要 auth.grant（自己放弃除外）
    if (check.reason !== 'self' && !req.user.is_super_admin) {
      const needOrgId = target.scopeType === 'project'
        ? await resolveProjectOrgId(target.scopeId)
        : target.scopeId;
      if (needOrgId != null && needOrgId !== 0) {
        const okAuth = hasCapability(
          req.user,
          'auth.grant',
          { scopeType: 'org', scopeId: needOrgId },
          req.grants,
        );
        if (!okAuth) return fail(res, 403, 2, '缺少 auth.grant');
      }
    }

    if (grantId) {
      await deleteGrantById(target.id);
    } else {
      await deleteGrantByKeys({
        userId: target.userId,
        capability: target.capability,
        scopeType: target.scopeType,
        scopeId: target.scopeId,
      });
    }

    await auditLog(req, 'revoke.capability', 'capability', String(target.id), {
      grantId: target.id,
      fromUserId: target.userId,
      capability: target.capability,
      scopeType: target.scopeType,
      scopeId: target.scopeId,
    });

    ok(res, null);
  } catch (err) {
    console.error('[auth/capability/revoke]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export { MODULE_WRITE_CAPS, getOrgIdsWithCapability };
