import app from '../../../app.js';
import pool from '../../../db/logDb.js';
import { fail, ok, truncate } from '../utils/response.js';
import { authenticateToken, requireOrgPermission } from '../../../middleware/auth.js';
import { assertOrgAccess, getAccessibleOrgIds } from '../utils/permissions.js';

app.post('/api/log/manage/log/list', authenticateToken, requireOrgPermission('view'), async (req, res) => {
  try {
    const {
      orgId,
      projectId,
      level,
      module,
      traceId,
      keyword,
      startTime,
      endTime,
      page = 1,
      pageSize = 20,
    } = req.body || {};

    if (orgId && !assertOrgAccess(req, orgId, 'view')) {
      return fail(res, 403, 2, '无权查询该组织日志');
    }
    if (projectId) {
      const [projRows] = await pool.execute('SELECT org_id FROM sys_project WHERE id = ?', [projectId]);
      if (!projRows.length) return fail(res, 400, 1, '项目不存在');
      if (!assertOrgAccess(req, projRows[0].org_id, 'view')) {
        return fail(res, 403, 2, '无权查询该项目日志');
      }
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const conditions = [];
    const params = [];

    if (orgId) {
      conditions.push('l.org_id = ?');
      params.push(orgId);
    }
    if (projectId) {
      conditions.push('l.project_id = ?');
      params.push(projectId);
    }
    if (level) {
      conditions.push('l.level = ?');
      params.push(String(level).toUpperCase());
    }
    if (module) {
      conditions.push('l.module LIKE ?');
      params.push(`%${module}%`);
    }
    if (traceId) {
      conditions.push('l.trace_id = ?');
      params.push(traceId);
    }
    if (keyword) {
      conditions.push('(l.content LIKE ? OR l.title LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (startTime) {
      conditions.push('l.create_time >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('l.create_time <= ?');
      params.push(endTime);
    }

    if (!req.user?.is_super_admin) {
      const accessible = getAccessibleOrgIds(req);
      if (!accessible.length) {
        return ok(res, { list: [], total: 0, page: p, pageSize: ps });
      }
      if (!orgId) {
        const placeholders = accessible.map(() => '?').join(',');
        conditions.push(`l.org_id IN (${placeholders})`);
        params.push(...accessible);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM sys_log l ${where}`,
      params,
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT l.id, l.org_id, l.project_id, l.level, l.module, l.title, l.content,
              l.trace_id, l.client_ip, l.create_time,
              o.org_name, p.project_name
       FROM sys_log l
       LEFT JOIN sys_org o ON o.id = l.org_id
       LEFT JOIN sys_project p ON p.id = l.project_id
       ${where}
       ORDER BY l.id DESC
       LIMIT ${ps} OFFSET ${offset}`,
      params,
    );

    const list = rows.map(row => ({
      ...row,
      content: truncate(row.content, 200),
    }));

    ok(res, { list, total, page: p, pageSize: ps });
  } catch (err) {
    console.error('[log/list]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/log/detail', authenticateToken, requireOrgPermission('view'), async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [rows] = await pool.execute(
      `SELECT l.*, o.org_name, p.project_name
       FROM sys_log l
       LEFT JOIN sys_org o ON o.id = l.org_id
       LEFT JOIN sys_project p ON p.id = l.project_id
       WHERE l.id = ?`,
      [id],
    );
    if (!rows.length) return fail(res, 400, 1, '日志不存在');

    if (!assertOrgAccess(req, rows[0].org_id, 'view')) {
      return fail(res, 403, 2, '无权查看该日志');
    }

    const row = rows[0];
    if (typeof row.data === 'string') {
      try {
        row.data = JSON.parse(row.data);
      } catch {
        /* keep as string */
      }
    }

    ok(res, row);
  } catch (err) {
    console.error('[log/detail]', err);
    fail(res, 500, 9, '数据库异常');
  }
});
