import pool from '../db/logDb.js';
import {
  hasCapability,
  resolveProjectOrgId,
} from '../auth/grants.js';

/**
 * 从 body 解析作用域。options:
 * - scopeType: 'org' | 'project' | 'platform'
 * - orgIdKeys / projectIdKeys: 字段名
 * - resolveProjectOrg: 是否查库补 org
 */
export function requireCapability(capability, options = {}) {
  const {
    scopeType: fixedScopeType,
    orgIdKeys = ['orgId', 'org_id', 'id'],
    projectIdKeys = ['projectId', 'project_id'],
    allowMissingScope = false,
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, code: 'NOT_TOKEN', msg: '未登录', data: null });
      }
      if (req.user.is_super_admin) return next();

      const body = req.body || {};
      let scopeType = fixedScopeType;
      let scopeId = null;
      let projectOrgId = null;

      if (scopeType === 'platform') {
        scopeId = 0;
      } else if (scopeType === 'org') {
        for (const key of orgIdKeys) {
          if (body[key] != null && body[key] !== '') {
            scopeId = Number(body[key]);
            break;
          }
        }
      } else if (scopeType === 'project') {
        for (const key of projectIdKeys) {
          if (body[key] != null && body[key] !== '') {
            scopeId = Number(body[key]);
            break;
          }
        }
        if (scopeId != null) {
          projectOrgId = await resolveProjectOrgId(scopeId);
        }
        // 若只有 orgId，仍不足以满足「需 project 作用域」的严格 API；由调用方保证
      } else {
        // 自动推断：优先 project，其次 org
        for (const key of projectIdKeys) {
          if (body[key] != null && body[key] !== '') {
            scopeType = 'project';
            scopeId = Number(body[key]);
            break;
          }
        }
        if (scopeId == null) {
          for (const key of orgIdKeys) {
            if (body[key] != null && body[key] !== '') {
              scopeType = 'org';
              scopeId = Number(body[key]);
              break;
            }
          }
        } else {
          projectOrgId = await resolveProjectOrgId(scopeId);
        }
      }

      if (scopeId == null && !allowMissingScope) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '权限不足（缺少作用域）', data: null });
      }

      if (scopeId == null && allowMissingScope) {
        return next();
      }

      const ok = hasCapability(
        req.user,
        capability,
        { scopeType, scopeId },
        req.grants || [],
        projectOrgId,
      );

      if (!ok) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', msg: '权限不足', data: null });
      }
      next();
    } catch (err) {
      console.error('[requireCapability]', err);
      return res.status(500).json({ success: false, code: 9, msg: '权限校验异常', data: null });
    }
  };
}

/**
 * 校验对指定 org 的能力（显式 orgId）
 */
export function assertCapability(req, capability, scope, projectOrgId = null) {
  return hasCapability(req.user, capability, scope, req.grants || [], projectOrgId);
}

/**
 * 按 projectId 校验 project 级能力（自动解析 org 覆盖）
 */
export async function assertProjectCapability(req, capability, projectId) {
  const orgId = await resolveProjectOrgId(projectId);
  if (orgId == null && !req.user?.is_super_admin) return false;
  return hasCapability(
    req.user,
    capability,
    { scopeType: 'project', scopeId: Number(projectId) },
    req.grants || [],
    orgId,
  );
}

/**
 * 从 key id 反查 project 后校验
 */
export async function assertKeyCapability(req, capability, keyId) {
  const [rows] = await pool.execute(
    `SELECT k.project_id, p.org_id
     FROM sys_api_key k
     JOIN sys_project p ON p.id = k.project_id
     WHERE k.id = ?`,
    [keyId],
  );
  if (!rows.length) return { ok: false, missing: true };
  const { project_id: projectId, org_id: orgId } = rows[0];
  const ok = hasCapability(
    req.user,
    capability,
    { scopeType: 'project', scopeId: Number(projectId) },
    req.grants || [],
    orgId,
  );
  return { ok, projectId, orgId, missing: false };
}
