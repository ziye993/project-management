export function getAccessibleOrgIds(req) {
  if (req.user?.is_super_admin) return null;
  const orgIds = new Set();
  for (const p of req.orgPermissions || []) {
    orgIds.add(Number(p.orgId));
  }
  for (const p of req.projectPermissions || []) {
    if (p.orgId != null) orgIds.add(Number(p.orgId));
  }
  return [...orgIds];
}

export function getManageOrgIds(req) {
  if (req.user?.is_super_admin) return null;
  const orgIds = new Set();
  for (const p of req.orgPermissions || []) {
    if (p.role === 'manage') orgIds.add(Number(p.orgId));
  }
  for (const p of req.projectPermissions || []) {
    if (p.role === 'manage' && p.orgId != null) orgIds.add(Number(p.orgId));
  }
  return [...orgIds];
}

export function buildOrgScope(req, column = 'o.id') {
  const orgIds = getAccessibleOrgIds(req);
  if (orgIds === null) return { clause: '', params: [] };
  if (!orgIds.length) return { clause: ' AND 1=0', params: [] };
  const placeholders = orgIds.map(() => '?').join(',');
  return { clause: ` AND ${column} IN (${placeholders})`, params: orgIds };
}

export function assertOrgAccess(req, orgId, level = 'view') {
  if (req.user?.is_super_admin) return true;
  const need = level === 'manage' ? 2 : 1;
  const orgPerm = req.orgPermissions?.find(p => Number(p.orgId) === Number(orgId));
  if (orgPerm) {
    const lv = orgPerm.role === 'manage' ? 2 : 1;
    if (lv >= need) return true;
  }
  const projectPerm = req.projectPermissions?.find(p => Number(p.orgId) === Number(orgId));
  if (projectPerm) {
    const lv = projectPerm.role === 'manage' ? 2 : 1;
    if (lv >= need) return true;
  }
  return false;
}
