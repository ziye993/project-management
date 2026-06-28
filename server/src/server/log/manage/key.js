import app from '../../../app.js';
import pool from '../../../db/logDb.js';
import { generateApiKey, hashApiKey } from '../utils/keyHash.js';
import { fail, ok } from '../utils/response.js';

app.post('/api/log/manage/key/list', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return fail(res, 400, 1, '缺少 projectId 参数');

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

app.post('/api/log/manage/key/create', async (req, res) => {
  try {
    const { projectId, key_name, expire_time, remark } = req.body || {};
    if (!projectId) return fail(res, 400, 1, '缺少 projectId 参数');

    const [projRows] = await pool.execute('SELECT id FROM sys_project WHERE id = ?', [projectId]);
    if (!projRows.length) return fail(res, 400, 1, '项目不存在');

    const plainKey = generateApiKey();
    const apiKeyHash = hashApiKey(plainKey);

    const [result] = await pool.execute(
      `INSERT INTO sys_api_key (project_id, api_key, key_name, expire_time, remark)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, apiKeyHash, key_name || null, expire_time || null, remark || null],
    );

    ok(res, { id: result.insertId, key: plainKey });
  } catch (err) {
    console.error('[key/create]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/key/toggleStatus', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [result] = await pool.execute(
      'UPDATE sys_api_key SET status = IF(status = 1, 0, 1) WHERE id = ?',
      [id],
    );
    if (result.affectedRows === 0) return fail(res, 400, 1, 'Key 不存在');

    const [rows] = await pool.execute('SELECT status FROM sys_api_key WHERE id = ?', [id]);
    ok(res, { id, status: rows[0].status });
  } catch (err) {
    console.error('[key/toggleStatus]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/key/delete', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [result] = await pool.execute('DELETE FROM sys_api_key WHERE id = ?', [id]);
    if (result.affectedRows === 0) return fail(res, 400, 1, 'Key 不存在');

    ok(res, { id });
  } catch (err) {
    console.error('[key/delete]', err);
    fail(res, 500, 9, '数据库异常');
  }
});
