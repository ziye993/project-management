import pool from '../db/logDb.js';
import { CAPABILITIES, PRESET_TENANT_ADMIN, getCapabilityMeta } from './capabilities.js';

export function serializeGrant(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    capability: row.capability,
    scopeType: row.scope_type ?? row.scopeType,
    scopeId: Number(row.scope_id ?? row.scopeId),
    canDelegate: !!(row.can_delegate ?? row.canDelegate),
    canRevokePeer: !!(row.can_revoke_peer ?? row.canRevokePeer),
    grantedBy: row.granted_by ?? row.grantedBy ?? null,
    grantSource: row.grant_source ?? row.grantSource ?? 'manual',
    createTime: row.create_time ?? row.createTime,
    updateTime: row.update_time ?? row.updateTime,
  };
}

export async function loadUserGrants(userId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, capability, scope_type, scope_id,
            can_delegate, can_revoke_peer, granted_by, grant_source,
            create_time, update_time
     FROM sys_capability_grant
     WHERE user_id = ?
     ORDER BY id ASC`,
    [userId],
  );
  return rows.map(serializeGrant);
}

export function matchScope(grant, needType, needId, projectOrgId) {
  const scopeType = grant.scopeType ?? grant.scope_type;
  const scopeId = Number(grant.scopeId ?? grant.scope_id);

  if (needType === 'platform') {
    return scopeType === 'org' && scopeId === 0;
  }
  if (needType === 'org') {
    return scopeType === 'org' && scopeId === Number(needId);
  }
  if (needType === 'project') {
    if (scopeType === 'project' && scopeId === Number(needId)) return true;
    if (scopeType === 'org' && projectOrgId != null
        && scopeId === Number(projectOrgId)) return true;
  }
  return false;
}

export function hasCapability(user, capability, scope, grants, projectOrgId) {
  if (!user) return false;
  if (user.is_super_admin) return true;
  const list = grants || [];
  return list.some(g =>
    g.capability === capability
    && matchScope(g, scope.scopeType, scope.scopeId, projectOrgId),
  );
}

export function findMatchingGrants(grants, capability, scope, projectOrgId) {
  return (grants || []).filter(g =>
    g.capability === capability
    && matchScope(g, scope.scopeType, scope.scopeId, projectOrgId),
  );
}

export function findOperatorGrant(grants, capability, scope, projectOrgId) {
  const matches = findMatchingGrants(grants, capability, scope, projectOrgId);
  if (!matches.length) return null;
  // 优先取可再授权、标志更全的
  return matches.sort((a, b) => {
    const score = (g) => (g.canDelegate ? 2 : 0) + (g.canRevokePeer ? 1 : 0);
    return score(b) - score(a);
  })[0];
}

export function clampFlags(operatorGrant, requested = {}) {
  if (!operatorGrant) {
    return { can_delegate: false, can_revoke_peer: false };
  }
  return {
    can_delegate: !!(requested.canDelegate !== false && operatorGrant.canDelegate),
    can_revoke_peer: !!(requested.canRevokePeer && operatorGrant.canRevokePeer),
  };
}

export function hasAnyCapability(user, grants, capabilityIds) {
  if (!user) return false;
  if (user.is_super_admin) return true;
  const set = new Set(capabilityIds);
  return (grants || []).some(g => set.has(g.capability));
}

export function getOrgIdsWithCapability(grants, capabilityIds) {
  const set = new Set(capabilityIds);
  const orgIds = new Set();
  for (const g of grants || []) {
    if (!set.has(g.capability)) continue;
    if (g.scopeType === 'org' && g.scopeId !== 0) orgIds.add(Number(g.scopeId));
  }
  return [...orgIds];
}

/** 操作者可管理的 org / project 作用域（用于用户列表与挂靠） */
export function getManageableScopes(grants) {
  const orgIds = new Set();
  const projectIds = new Set();
  for (const g of grants || []) {
    if (g.scopeType === 'org' && Number(g.scopeId) !== 0) {
      orgIds.add(Number(g.scopeId));
    } else if (g.scopeType === 'project') {
      projectIds.add(Number(g.scopeId));
    }
  }
  return {
    orgIds: [...orgIds],
    projectIds: [...projectIds],
  };
}

export function getOrgsWhereCanCreateUser(grants) {
  return getOrgIdsWithCapability(grants, ['auth.user.create']);
}

export function getOrgsWhereCanGrant(grants) {
  return getOrgIdsWithCapability(grants, ['auth.grant']);
}

export function getAccessibleOrgIdsFromGrants(user, grants) {
  if (user?.is_super_admin) return null;
  const orgIds = new Set();
  const projectIds = [];
  for (const g of grants || []) {
    if (g.scopeType === 'org' && g.scopeId !== 0) {
      orgIds.add(Number(g.scopeId));
    } else if (g.scopeType === 'project') {
      projectIds.push(Number(g.scopeId));
    }
  }
  return { orgIds: [...orgIds], projectIds: [...new Set(projectIds)] };
}

/** 异步解析可访问 org（含 project 级 grant 反查） */
export async function resolveAccessibleOrgIds(user, grants) {
  if (user?.is_super_admin) return null;
  const { orgIds, projectIds } = getAccessibleOrgIdsFromGrants(user, grants);
  const set = new Set(orgIds);
  if (projectIds.length) {
    const placeholders = projectIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT DISTINCT org_id FROM sys_project WHERE id IN (${placeholders})`,
      projectIds,
    );
    for (const row of rows) {
      if (row.org_id != null) set.add(Number(row.org_id));
    }
  }
  return [...set];
}

/**
 * 解析项目所属 org，供 project 级能力做 org 覆盖匹配
 */
export async function resolveProjectOrgId(projectId) {
  if (projectId == null) return null;
  const [rows] = await pool.execute('SELECT org_id FROM sys_project WHERE id = ?', [projectId]);
  return rows[0]?.org_id ?? null;
}

export async function getGrantById(grantId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, capability, scope_type, scope_id,
            can_delegate, can_revoke_peer, granted_by, grant_source,
            create_time, update_time
     FROM sys_capability_grant WHERE id = ?`,
    [grantId],
  );
  return serializeGrant(rows[0]);
}

export async function insertGrant({
  userId,
  capability,
  scopeType,
  scopeId,
  canDelegate,
  canRevokePeer,
  grantedBy,
  grantSource = 'manual',
  conn = pool,
}) {
  const [result] = await conn.execute(
    `INSERT INTO sys_capability_grant
      (user_id, capability, scope_type, scope_id, can_delegate, can_revoke_peer, granted_by, grant_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       can_delegate = VALUES(can_delegate),
       can_revoke_peer = VALUES(can_revoke_peer),
       granted_by = VALUES(granted_by),
       grant_source = VALUES(grant_source)`,
    [
      userId,
      capability,
      scopeType,
      scopeId,
      canDelegate ? 1 : 0,
      canRevokePeer ? 1 : 0,
      grantedBy ?? null,
      grantSource,
    ],
  );
  return result.insertId || null;
}

export async function deleteGrantById(grantId, conn = pool) {
  const [result] = await conn.execute(
    'DELETE FROM sys_capability_grant WHERE id = ?',
    [grantId],
  );
  return result.affectedRows > 0;
}

export async function deleteGrantByKeys({ userId, capability, scopeType, scopeId }, conn = pool) {
  const [result] = await conn.execute(
    `DELETE FROM sys_capability_grant
     WHERE user_id = ? AND capability = ? AND scope_type = ? AND scope_id = ?`,
    [userId, capability, scopeType, scopeId],
  );
  return result.affectedRows > 0;
}

export async function bootstrapTenantAdmin(conn, { userId, orgId, grantedBy }) {
  for (const capability of PRESET_TENANT_ADMIN) {
    await insertGrant({
      userId,
      capability,
      scopeType: 'org',
      scopeId: orgId,
      canDelegate: true,
      canRevokePeer: true,
      grantedBy,
      grantSource: 'tenant_bootstrap',
      conn,
    });
  }
}

/**
 * 校验操作者能否把 capability 授到目标 scope
 * 返回 { ok, operatorGrant, flags, error }
 */
export function canGrantCapability(operator, operatorGrants, {
  capability,
  scopeType,
  scopeId,
  canDelegate,
  canRevokePeer,
  projectOrgId,
}) {
  if (!operator) return { ok: false, error: '未登录' };
  if (operator.is_super_admin) {
    return {
      ok: true,
      operatorGrant: {
        canDelegate: true,
        canRevokePeer: true,
      },
      flags: {
        can_delegate: canDelegate !== false,
        can_revoke_peer: !!canRevokePeer,
      },
    };
  }

  const meta = getCapabilityMeta(capability);
  if (!meta) return { ok: false, error: '未知能力' };

  // platform 能力存 org/0
  const checkScope = scopeType === 'org' && Number(scopeId) === 0
    ? { scopeType: 'platform', scopeId: 0 }
    : { scopeType, scopeId };

  // 授出作用域不可宽于自身：org 能力只能用 org 级 grant；project 可用 org 覆盖或同 project
  const operatorGrant = findOperatorGrant(
    operatorGrants,
    capability,
    checkScope,
    projectOrgId,
  );

  if (!operatorGrant || !operatorGrant.canDelegate) {
    return { ok: false, error: '无权授出该能力（缺少可再授权的持有）' };
  }

  // 操作者仅有 project 级时，不可授出 org 级
  if (scopeType === 'org' && operatorGrant.scopeType === 'project') {
    return { ok: false, error: '项目级能力不能升格为租户级授权' };
  }

  const flags = clampFlags(operatorGrant, { canDelegate, canRevokePeer });
  return { ok: true, operatorGrant, flags };
}

/**
 * 校验操作者能否收回某条 grant
 */
export function canRevokeGrant(operator, operatorGrants, targetGrant, projectOrgId = null) {
  if (!operator || !targetGrant) return { ok: false, error: '参数无效' };
  if (operator.is_super_admin) return { ok: true, reason: 'super' };

  // 放弃自己的
  if (Number(targetGrant.userId) === Number(operator.id)) {
    return { ok: true, reason: 'self' };
  }

  // 自己发出的
  if (targetGrant.grantedBy != null && Number(targetGrant.grantedBy) === Number(operator.id)) {
    return { ok: true, reason: 'granted_by' };
  }

  const checkScope = targetGrant.scopeType === 'org' && Number(targetGrant.scopeId) === 0
    ? { scopeType: 'platform', scopeId: 0 }
    : { scopeType: targetGrant.scopeType, scopeId: targetGrant.scopeId };

  const matches = findMatchingGrants(
    operatorGrants,
    targetGrant.capability,
    checkScope,
    projectOrgId,
  );
  const peer = matches.find(g => g.canRevokePeer);
  if (peer) return { ok: true, reason: 'peer' };

  return { ok: false, error: '无权收回该授权' };
}

export function isKnownCapability(capability) {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, capability);
}

export function normalizeScopeForCapability(capability, scopeType, scopeId) {
  const meta = getCapabilityMeta(capability);
  if (!meta) return { ok: false, error: '未知能力' };

  if (meta.scope === 'platform') {
    return { ok: true, scopeType: 'org', scopeId: 0 };
  }

  if (!['org', 'project'].includes(scopeType)) {
    return { ok: false, error: '无效作用域类型' };
  }
  if (scopeId == null || Number.isNaN(Number(scopeId))) {
    return { ok: false, error: '无效作用域 ID' };
  }

  // org 能力不可用 project scope 存放（存 org 即可覆盖项目）
  if (meta.scope === 'org' && scopeType === 'project') {
    return { ok: false, error: '该能力仅支持租户级作用域' };
  }

  return { ok: true, scopeType, scopeId: Number(scopeId) };
}
