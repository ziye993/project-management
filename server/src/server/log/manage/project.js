import app from '../../../app.js';
import pool from '../../../db/logDb.js';
import { fail, ok } from '../utils/response.js';

app.post('/api/log/manage/project/list', async (req, res) => {
  try {
    const { orgId } = req.body || {};
    if (!orgId) return fail(res, 400, 1, '缺少 orgId 参数');

    const [rows] = await pool.execute(
      `SELECT id, org_id, project_name, project_code, description, status, create_time, update_time
       FROM sys_project WHERE org_id = ? ORDER BY id DESC`,
      [orgId],
    );

    ok(res, rows);
  } catch (err) {
    console.error('[project/list]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/project/create', async (req, res) => {
  try {
    const { orgId, project_name, project_code, description } = req.body || {};
    if (!orgId) return fail(res, 400, 1, '缺少 orgId 参数');
    if (!project_name || !String(project_name).trim()) {
      return fail(res, 400, 1, 'project_name 必填');
    }
    if (!project_code || !String(project_code).trim()) {
      return fail(res, 400, 1, 'project_code 必填');
    }

    const [orgRows] = await pool.execute('SELECT id FROM sys_org WHERE id = ?', [orgId]);
    if (!orgRows.length) return fail(res, 400, 1, '组织不存在');

    const [result] = await pool.execute(
      `INSERT INTO sys_project (org_id, project_name, project_code, description)
       VALUES (?, ?, ?, ?)`,
      [orgId, project_name.trim(), project_code.trim(), description || null],
    );

    ok(res, { id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 400, 1, 'project_code 已存在');
    }
    console.error('[project/create]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/project/update', async (req, res) => {
  try {
    const { id, project_name, description, status } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');
    if (!project_name || !String(project_name).trim()) {
      return fail(res, 400, 1, 'project_name 必填');
    }

    const [result] = await pool.execute(
      `UPDATE sys_project
       SET project_name = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        project_name.trim(),
        description || null,
        status !== undefined ? parseInt(status, 10) : 1,
        id,
      ],
    );

    if (result.affectedRows === 0) return fail(res, 400, 1, '项目不存在');
    ok(res, { id });
  } catch (err) {
    console.error('[project/update]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/project/toggleStatus', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [result] = await pool.execute(
      'UPDATE sys_project SET status = IF(status = 1, 0, 1) WHERE id = ?',
      [id],
    );
    if (result.affectedRows === 0) return fail(res, 400, 1, '项目不存在');

    const [rows] = await pool.execute('SELECT status FROM sys_project WHERE id = ?', [id]);
    ok(res, { id, status: rows[0].status });
  } catch (err) {
    console.error('[project/toggleStatus]', err);
    fail(res, 500, 9, '数据库异常');
  }
});
