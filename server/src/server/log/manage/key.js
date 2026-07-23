import app from '../../../app.js';
import pool from '../../../db/logDb.js';
import { generateApiKey, hashApiKey } from '../utils/keyHash.js';
import { fail, ok } from '../utils/response.js';
import { authenticateToken, auditLog } from '../../../middleware/auth.js';
import { assertProjectCapability } from '../utils/permissions.js';

async function getProjectOrgId(projectId) {
  const [rows] = await pool.execute('SELECT org_id FROM sys_project WHERE id = ?', [projectId]);
  return rows[0]?.org_id;
}

app.post('/api/log/manage/key/list', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return fail(res, 400, 1, '缺少 projectId 参数');

    const orgId = await getProjectOrgId(projectId);
    if (!orgId) return fail(res, 400, 1, '项目不存在');
    if (!(await assertProjectCapability(req, 'log.key.list', projectId))) {
      return fail(res, 403, 2, '无权访问');
    }

    const [rows] = await pool.execute(
      `SELECT id, key_name, status, expire_time, last_used_time, last_ip, create_time, remark
       FROM sys_api_key WHERE project_id = ? ORDER BY id DESC`,
      [projectId],
    );

    ok(res, rows);
  } catch (err) {
    console.error('[key/list]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/key/create', authenticateToken, async (req, res) => {
  try {
    const { projectId, key_name, expire_time, remark } = req.body || {};
    if (!projectId) return fail(res, 400, 1, '缺少 projectId 参数');

    const orgId = await getProjectOrgId(projectId);
    if (!orgId) return fail(res, 400, 1, '项目不存在');
    if (!(await assertProjectCapability(req, 'log.key.create', projectId))) {
      return fail(res, 403, 2, '无权操作');
    }

    const plainKey = generateApiKey();
    const apiKeyHash = hashApiKey(plainKey);

    const [result] = await pool.execute(
      `INSERT INTO sys_api_key (project_id, api_key, key_name, expire_time, remark)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, apiKeyHash, key_name || null, expire_time || null, remark || null],
    );

    await auditLog(req, 'key.create', 'key', result.insertId, { projectId });
    ok(res, { id: result.insertId, key: plainKey });
  } catch (err) {
    console.error('[key/create]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/key/toggleStatus', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [keyRows] = await pool.execute(
      'SELECT k.project_id, p.org_id FROM sys_api_key k JOIN sys_project p ON p.id = k.project_id WHERE k.id = ?',
      [id],
    );
    if (!keyRows.length) return fail(res, 400, 1, 'Key 不存在');
    if (!(await assertProjectCapability(req, 'log.key.toggle', keyRows[0].project_id))) {
      return fail(res, 403, 2, '无权操作');
    }

    const [result] = await pool.execute(
      'UPDATE sys_api_key SET status = IF(status = 1, 0, 1) WHERE id = ?',
      [id],
    );
    if (result.affectedRows === 0) return fail(res, 400, 1, 'Key 不存在');

    const [rows] = await pool.execute('SELECT status FROM sys_api_key WHERE id = ?', [id]);
    await auditLog(req, 'key.toggleStatus', 'key', id, { status: rows[0].status });
    ok(res, { id, status: rows[0].status });
  } catch (err) {
    console.error('[key/toggleStatus]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/key/delete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [keyRows] = await pool.execute(
      'SELECT k.project_id, p.org_id FROM sys_api_key k JOIN sys_project p ON p.id = k.project_id WHERE k.id = ?',
      [id],
    );
    if (!keyRows.length) return fail(res, 400, 1, 'Key 不存在');
    if (!(await assertProjectCapability(req, 'log.key.delete', keyRows[0].project_id))) {
      return fail(res, 403, 2, '无权操作');
    }

    const [result] = await pool.execute('DELETE FROM sys_api_key WHERE id = ?', [id]);
    if (result.affectedRows === 0) return fail(res, 400, 1, 'Key 不存在');

    await auditLog(req, 'key.delete', 'key', id);
    ok(res, { id });
  } catch (err) {
    console.error('[key/delete]', err);
    fail(res, 500, 9, '数据库异常');
  }
});
