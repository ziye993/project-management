import {
  resolveAccessibleOrgIds,
  hasCapability,
  resolveProjectOrgId,
} from '../../../auth/grants.js';

/** @returns {Promise<null|number[]>} null = 超管不限 */
export async function getAccessibleOrgIds(req) {
  return resolveAccessibleOrgIds(req.user, req.grants);
}

export function assertOrgCapability(req, capability, orgId) {
  return hasCapability(
    req.user,
    capability,
    { scopeType: 'org', scopeId: Number(orgId) },
    req.grants || [],
  );
}

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

/** 是否可查看该 org（任一相关读能力或写能力） */
export function assertOrgReadable(req, orgId) {
  if (req.user?.is_super_admin) return true;
  const caps = [
    'log.org.read', 'log.org.update',
    'log.project.create', 'log.project.update', 'log.project.read',
    'log.key.list', 'log.key.create', 'log.key.toggle', 'log.key.delete',
    'log.query', 'log.query.detail',
    'auth.grant', 'auth.grant.list', 'auth.user.create', 'auth.user.update',
  ];
  return caps.some(c => assertOrgCapability(req, c, orgId));
}
