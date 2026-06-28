import app from '../../../app.js';
import pool from '../../../db/logDb.js';
import { fail, ok } from '../utils/response.js';

app.post('/api/log/manage/org/list', async (req, res) => {
  try {
    const { orgName, status, page = 1, pageSize = 20 } = req.body || {};
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const conditions = [];
    const params = [];

    if (orgName) {
      conditions.push('o.org_name LIKE ?');
      params.push(`%${orgName}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      conditions.push('o.status = ?');
      params.push(parseInt(status, 10));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM sys_org o ${where}`,
      params,
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT o.id, o.org_name, o.contact_name, o.contact_phone, o.status, o.create_time,
              (SELECT COUNT(*) FROM sys_project p WHERE p.org_id = o.id) AS projectCount
       FROM sys_org o
       ${where}
       ORDER BY o.id DESC
       LIMIT ${ps} OFFSET ${offset}`,
      params,
    );

    ok(res, { list: rows, total, page: p, pageSize: ps });
  } catch (err) {
    console.error('[org/list]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/org/detail', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [rows] = await pool.execute(
      `SELECT o.*,
              (SELECT COUNT(*) FROM sys_project p WHERE p.org_id = o.id) AS projectCount
       FROM sys_org o WHERE o.id = ?`,
      [id],
    );
    if (!rows.length) return fail(res, 400, 1, '组织不存在');

    ok(res, rows[0]);
  } catch (err) {
    console.error('[org/detail]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/org/create', async (req, res) => {
  try {
    const { org_name, contact_name, contact_phone, remark } = req.body || {};
    if (!org_name || !String(org_name).trim()) {
      return fail(res, 400, 1, 'org_name 必填');
    }

    const [result] = await pool.execute(
      `INSERT INTO sys_org (org_name, contact_name, contact_phone, remark)
       VALUES (?, ?, ?, ?)`,
      [org_name.trim(), contact_name || null, contact_phone || null, remark || null],
    );

    ok(res, { id: result.insertId });
  } catch (err) {
    console.error('[org/create]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/org/update', async (req, res) => {
  try {
    const { id, org_name, contact_name, contact_phone, remark, status } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');
    if (!org_name || !String(org_name).trim()) {
      return fail(res, 400, 1, 'org_name 必填');
    }

    const [result] = await pool.execute(
      `UPDATE sys_org
       SET org_name = ?, contact_name = ?, contact_phone = ?, remark = ?, status = ?
       WHERE id = ?`,
      [
        org_name.trim(),
        contact_name || null,
        contact_phone || null,
        remark || null,
        status !== undefined ? parseInt(status, 10) : 1,
        id,
      ],
    );

    if (result.affectedRows === 0) return fail(res, 400, 1, '组织不存在');
    ok(res, { id });
  } catch (err) {
    console.error('[org/update]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/org/toggleStatus', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');

    const [result] = await pool.execute(
      'UPDATE sys_org SET status = IF(status = 1, 0, 1) WHERE id = ?',
      [id],
    );
    if (result.affectedRows === 0) return fail(res, 400, 1, '组织不存在');

    const [rows] = await pool.execute('SELECT status FROM sys_org WHERE id = ?', [id]);
    ok(res, { id, status: rows[0].status });
  } catch (err) {
    console.error('[org/toggleStatus]', err);
    fail(res, 500, 9, '数据库异常');
  }
});
