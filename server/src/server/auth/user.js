import bcrypt from 'bcrypt';
import pool from '../../db/logDb.js';
import { auditLog } from '../../middleware/auth.js';
import {
  listCapabilityCatalog,
  MODULE_WRITE_CAPS,
  getCapabilityMeta,
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
  getManageableScopes,
  getOrgsWhereCanCreateUser,
  getOrgsWhereCanGrant,
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

/** 非超管不可碰平台超管账号 */
async function loadTargetUser(userId) {
  const [rows] = await pool.execute(
    'SELECT id, username, email, status, is_super_admin FROM sys_user WHERE id = ?',
    [userId],
  );
  return rows[0] || null;
}

/**
 * 目标用户是否在操作者可管范围内：
 * - 超管：任意非… 超管可管所有
 * - 非超管：目标不能是平台超管；且目标在可管 org/project 上有授权，或尚无任何授权（待挂靠）
 */
async function assertCanAccessUser(req, targetUserId, { allowOrphan = false } = {}) {
  if (req.user?.is_super_admin) return { ok: true };

  const target = await loadTargetUser(targetUserId);
  if (!target) return { ok: false, error: '用户不存在' };
  if (target.is_super_admin) return { ok: false, error: '无权操作平台超管' };

  if (Number(target.id) === Number(req.user.id)) return { ok: true, target };

  const scopes = getManageableScopes(req.grants);
  if (!scopes.orgIds.length && !scopes.projectIds.length) {
    return { ok: false, error: '无可管理的组织/项目' };
  }

  const clauses = [];
  const params = [targetUserId];
  if (scopes.orgIds.length) {
    clauses.push(`(scope_type = 'org' AND scope_id IN (${scopes.orgIds.map(() => '?').join(',')}))`);
    params.push(...scopes.orgIds);
  }
  if (scopes.projectIds.length) {
    clauses.push(`(scope_type = 'project' AND scope_id IN (${scopes.projectIds.map(() => '?').join(',')}))`);
    params.push(...scopes.projectIds);
  }

  const [overlap] = await pool.execute(
    `SELECT id FROM sys_capability_grant
     WHERE user_id = ? AND (${clauses.join(' OR ')})
     LIMIT 1`,
    params,
  );
  if (overlap.length) return { ok: true, target };

  if (allowOrphan) {
    const [anyGrant] = await pool.execute(
      'SELECT id FROM sys_capability_grant WHERE user_id = ? LIMIT 1',
      [targetUserId],
    );
    if (!anyGrant.length) return { ok: true, target, orphan: true };
  }

  return { ok: false, error: '无权管理该用户（不在你的组织/项目范围内）' };
}

/** 过滤目标用户的 grants：非超管只看自己可管 scope 内的 */
function filterGrantsForViewer(req, grants) {
  if (req.user?.is_super_admin) return grants;
  const scopes = getManageableScopes(req.grants);
  const orgSet = new Set(scopes.orgIds);
  const projectSet = new Set(scopes.projectIds);
  return (grants || []).filter(g => {
    if (g.scopeType === 'org' && Number(g.scopeId) === 0) return false; // 平台级不对租户管理员展示
    if (g.scopeType === 'org') return orgSet.has(Number(g.scopeId));
    if (g.scopeType === 'project') return projectSet.has(Number(g.scopeId));
    return false;
  });
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

    if (!req.user.is_super_admin) {
      conditions.push('u.is_super_admin = 0');
      const scopes = getManageableScopes(req.grants);
      if (!scopes.orgIds.length && !scopes.projectIds.length) {
        return ok(res, { list: [], total: 0, page: p, pageSize: ps });
      }
      const scopeParts = [];
      if (scopes.orgIds.length) {
        scopeParts.push(`(g.scope_type = 'org' AND g.scope_id IN (${scopes.orgIds.map(() => '?').join(',')}))`);
        params.push(...scopes.orgIds);
      }
      if (scopes.projectIds.length) {
        scopeParts.push(`(g.scope_type = 'project' AND g.scope_id IN (${scopes.projectIds.map(() => '?').join(',')}))`);
        params.push(...scopes.projectIds);
      }
      // 在可管范围内有授权的用户（创建时会挂靠，故会出现在列表）
      conditions.push(`EXISTS (
          SELECT 1 FROM sys_capability_grant g
          WHERE g.user_id = u.id AND (${scopeParts.join(' OR ')})
        )`);
    }

    if (username) {
      conditions.push('u.username LIKE ?');
      params.push(`%${username}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      conditions.push('u.status = ?');
      params.push(parseInt(status, 10));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM sys_user u ${where}`,
      params,
    );

    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.email, u.status, u.is_super_admin, u.create_time, u.update_time
       FROM sys_user u ${where}
       ORDER BY u.id DESC
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

    const { username, password, email, orgId, projectId } = req.body || {};
    if (!username?.trim() || !password) {
      return fail(res, 400, 1, '用户名和密码必填');
    }

    let attachOrgId = orgId != null && orgId !== '' ? Number(orgId) : null;
    let attachProjectId = projectId != null && projectId !== '' ? Number(projectId) : null;

    if (!req.user.is_super_admin) {
      if (!attachOrgId) return fail(res, 400, 1, '请选择要挂靠的组织');
      const allowedOrgs = getOrgsWhereCanCreateUser(req.grants);
      if (!allowedOrgs.includes(attachOrgId)) {
        return fail(res, 403, 2, '无权在该组织下创建用户');
      }
      if (attachProjectId) {
        const pOrg = await resolveProjectOrgId(attachProjectId);
        if (Number(pOrg) !== attachOrgId) {
          return fail(res, 400, 1, '项目不属于所选组织');
        }
        // 若操作者对该项目无任何覆盖能力，仍允许挂靠到组织；项目级额外挂靠需有权看见该项目
        const scopes = getManageableScopes(req.grants);
        const coveredByOrg = scopes.orgIds.includes(attachOrgId);
        const coveredByProject = scopes.projectIds.includes(attachProjectId);
        if (!coveredByOrg && !coveredByProject) {
          return fail(res, 403, 2, '无权挂靠到该项目');
        }
      }
    } else if (attachProjectId && !attachOrgId) {
      attachOrgId = await resolveProjectOrgId(attachProjectId);
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO sys_user (username, password_hash, email) VALUES (?, ?, ?)',
      [username.trim(), hash, email || null],
    );
    const newUserId = result.insertId;

    // 挂靠：写入最小可读授权，便于出现在该组织用户列表中
    if (attachOrgId) {
      await insertGrant({
        userId: newUserId,
        capability: 'auth.grant.list',
        scopeType: 'org',
        scopeId: attachOrgId,
        canDelegate: false,
        canRevokePeer: false,
        grantedBy: req.user.id,
        grantSource: 'user_create',
      });
    }
    if (attachProjectId) {
      await insertGrant({
        userId: newUserId,
        capability: 'log.project.read',
        scopeType: 'project',
        scopeId: attachProjectId,
        canDelegate: false,
        canRevokePeer: false,
        grantedBy: req.user.id,
        grantSource: 'user_create',
      });
    }

    await auditLog(req, 'user.create', 'user', newUserId, {
      username,
      orgId: attachOrgId,
      projectId: attachProjectId,
    });
    ok(res, { id: newUserId, orgId: attachOrgId, projectId: attachProjectId });
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

    const access = await assertCanAccessUser(req, id, { allowOrphan: true });
    if (!access.ok) return fail(res, 403, 2, access.error);

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

    const access = await assertCanAccessUser(req, id, { allowOrphan: true });
    if (!access.ok) return fail(res, 403, 2, access.error);

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

    const delegable = new Set(
      (req.grants || [])
        .filter(g => g.canDelegate)
        .map(g => g.capability),
    );
    // 可再授权的能力均可出现在目录（含平台级 module.*.access）
    ok(res, {
      list: catalog.filter(c => delegable.has(c.id)),
    });
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

/** 可授权作用域列表：供前端选组织→项目 */
export async function capabilityScopes(req, res) {
  try {
    if (!req.user) return fail(res, 401, 'NOT_TOKEN', '未登录');

    if (req.user.is_super_admin) {
      const [orgs] = await pool.execute(
        'SELECT id, org_name FROM sys_org ORDER BY id DESC',
      );
      const [projects] = await pool.execute(
        'SELECT id, org_id, project_name, project_code FROM sys_project ORDER BY id DESC',
      );
      return ok(res, {
        orgs,
        projects,
        canOrgLevel: true,
        canOrgLevelByOrg: Object.fromEntries(orgs.map(o => [o.id, true])),
        createUserOrgIds: orgs.map(o => o.id),
        platform: true,
      });
    }

    const scopes = getManageableScopes(req.grants);
    const grantOrgs = new Set(getOrgsWhereCanGrant(req.grants));
    const createOrgs = new Set(getOrgsWhereCanCreateUser(req.grants));
    // 可授出的 org = 持有 auth.grant 的 org；也可从 project 反查 org 供选择
    let orgIds = [...new Set([...grantOrgs, ...createOrgs])];
    const projectIds = scopes.projectIds;

    if (projectIds.length) {
      const ph = projectIds.map(() => '?').join(',');
      const [prows] = await pool.execute(
        `SELECT DISTINCT org_id FROM sys_project WHERE id IN (${ph})`,
        projectIds,
      );
      for (const r of prows) {
        if (r.org_id != null) orgIds.push(Number(r.org_id));
      }
    }
    orgIds = [...new Set(orgIds)];

    let orgs = [];
    if (orgIds.length) {
      const [rows] = await pool.execute(
        `SELECT id, org_name FROM sys_org WHERE id IN (${orgIds.map(() => '?').join(',')}) ORDER BY id DESC`,
        orgIds,
      );
      orgs = rows;
    }

    let projects = [];
    // 组织级 auth.grant：该 org 下全部项目；否则仅自己有 project 授权的项目
    const fullOrgIds = [...grantOrgs];
    if (fullOrgIds.length) {
      const [rows] = await pool.execute(
        `SELECT id, org_id, project_name, project_code FROM sys_project
         WHERE org_id IN (${fullOrgIds.map(() => '?').join(',')})
         ORDER BY id DESC`,
        fullOrgIds,
      );
      projects = rows;
    }
    if (projectIds.length) {
      const existing = new Set(projects.map(p => Number(p.id)));
      const missing = projectIds.filter(id => !existing.has(id));
      if (missing.length) {
        const [rows] = await pool.execute(
          `SELECT id, org_id, project_name, project_code FROM sys_project
           WHERE id IN (${missing.map(() => '?').join(',')})`,
          missing,
        );
        projects = projects.concat(rows);
      }
    }

    const canOrgLevelByOrg = {};
    for (const oid of grantOrgs) {
      canOrgLevelByOrg[oid] = true;
    }

    const createUserOrgIds = [...createOrgs];

    const canPlatform = (req.grants || []).some(g =>
      g.canDelegate
      && g.scopeType === 'org'
      && Number(g.scopeId) === 0
      && getCapabilityMeta(g.capability)?.scope === 'platform',
    );

    ok(res, {
      orgs,
      projects,
      canOrgLevelByOrg,
      createUserOrgIds,
      platform: canPlatform,
    });
  } catch (err) {
    console.error('[auth/capability/scopes]', err);
    fail(res, 500, 9, '数据库异常');
  }
}

export async function capabilityListByUser(req, res) {
  try {
    if (!req.user) return fail(res, 401, 'NOT_TOKEN', '未登录');
    const userId = Number(req.body?.userId);
    if (!userId) return fail(res, 400, 1, '缺少 userId');

    const isSelf = Number(req.user.id) === userId;
    if (!isSelf) {
      const canList = req.user.is_super_admin
        || hasAnyCapability(req.user, req.grants, ['auth.grant.list', 'auth.grant']);
      if (!canList) return fail(res, 403, 2, '权限不足');

      const access = await assertCanAccessUser(req, userId, { allowOrphan: true });
      if (!access.ok) return fail(res, 403, 2, access.error);
    } else {
      const target = await loadTargetUser(userId);
      if (!target) return fail(res, 400, 1, '用户不存在');
    }

    const grants = await loadUserGrants(userId);
    const visible = (isSelf || req.user.is_super_admin)
      ? grants
      : filterGrantsForViewer(req, grants);
    ok(res, { grants: visible });
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

    const access = await assertCanAccessUser(req, userId, { allowOrphan: true });
    if (!access.ok) return fail(res, 403, 2, access.error);

    const normalized = normalizeScopeForCapability(capability, scopeType, scopeId);
    if (!normalized.ok) return fail(res, 400, 1, normalized.error);

    if (!req.user.is_super_admin && normalized.scopeType === 'org' && Number(normalized.scopeId) === 0) {
      return fail(res, 403, 2, '无权授出平台级能力');
    }

    if (!req.user.is_super_admin) {
      const hasGrantCap = hasAnyCapability(req.user, req.grants, ['auth.grant']);
      if (!hasGrantCap && capability !== 'module.appStore.write') {
        return fail(res, 403, 2, '缺少 auth.grant 能力');
      }
      if (capability === 'module.appStore.write') {
        return fail(res, 403, 2, '无权授出应用商店写能力');
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

    if (!req.user.is_super_admin && normalized.scopeType === 'org' && normalized.scopeId !== 0) {
      const okAuth = hasCapability(
        req.user,
        'auth.grant',
        { scopeType: 'org', scopeId: normalized.scopeId },
        req.grants,
      );
      if (!okAuth) return fail(res, 403, 2, '无权在该租户下授权');
    }
    if (!req.user.is_super_admin && normalized.scopeType === 'project') {
      // 组织级 auth.grant 可覆盖；或仅有项目级时不允许授 org 能力（已在 canGrantCapability）
      const okAuthOrg = hasCapability(
        req.user,
        'auth.grant',
        { scopeType: 'org', scopeId: projectOrgId },
        req.grants,
      );
      if (!okAuthOrg) {
        return fail(res, 403, 2, '无权在该租户下授权（需要组织级 auth.grant）');
      }
    }

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

    const access = await assertCanAccessUser(req, target.userId, { allowOrphan: true });
    if (!access.ok) return fail(res, 403, 2, access.error);

    let projectOrgId = null;
    if (target.scopeType === 'project') {
      projectOrgId = await resolveProjectOrgId(target.scopeId);
    }

    const check = canRevokeGrant(req.user, req.grants, target, projectOrgId);
    if (!check.ok) return fail(res, 403, 2, check.error);

    if (check.reason !== 'self' && !req.user.is_super_admin) {
      const needOrgId = target.scopeType === 'project' ? projectOrgId : target.scopeId;
      if (needOrgId != null && needOrgId !== 0) {
        const okAuth = hasCapability(
          req.user,
          'auth.grant',
          { scopeType: 'org', scopeId: needOrgId },
          req.grants,
        );
        if (!okAuth) return fail(res, 403, 2, '缺少 auth.grant');
      }
      if (target.scopeType === 'org' && Number(target.scopeId) === 0) {
        return fail(res, 403, 2, '无权收回平台级授权');
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
