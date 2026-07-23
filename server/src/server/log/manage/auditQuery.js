import app from '../../../app.js';
import pool from '../../../db/logDb.js';
import { fail, ok, truncate } from '../utils/response.js';
import { authenticateToken, requireSuperAdmin } from '../../../middleware/auth.js';

/** 系统日志（sys_audit_log）：仅平台超管 */
app.post('/api/log/manage/audit/list', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      action,
      username,
      keyword,
      startTime,
      endTime,
      page = 1,
      pageSize = 20,
    } = req.body || {};

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const conditions = [];
    const params = [];

    if (action) {
      conditions.push('action LIKE ?');
      params.push(`%${action}%`);
    }
    if (username) {
      conditions.push('username LIKE ?');
      params.push(`%${username}%`);
    }
    if (keyword) {
      conditions.push('(action LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR CAST(detail AS CHAR) LIKE ?)');
      const k = `%${keyword}%`;
      params.push(k, k, k, k);
    }
    if (startTime) {
      conditions.push('create_time >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('create_time <= ?');
      params.push(endTime);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM sys_audit_log ${where}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.execute(
      `SELECT id, user_id, username, action, target_type, target_id, detail,
              client_ip, channel, create_time
       FROM sys_audit_log
       ${where}
       ORDER BY id DESC
       LIMIT ${ps} OFFSET ${offset}`,
      params,
    );

    const list = (rows || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      detail: row.detail,
      clientIp: row.client_ip,
      channel: row.channel,
      createTime: row.create_time,
      detailPreview: truncate(
        typeof row.detail === 'string' ? row.detail : JSON.stringify(row.detail ?? ''),
        120,
      ),
    }));

    ok(res, { list, total, page: p, pageSize: ps });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '查询系统日志失败');
  }
});

app.post('/api/log/manage/audit/detail', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.body?.id);
    if (!id) return fail(res, 400, 1, '缺少 id');

    const [rows] = await pool.execute(
      `SELECT id, user_id, username, action, target_type, target_id, detail,
              client_ip, channel, create_time
       FROM sys_audit_log WHERE id = ?`,
      [id],
    );
    const row = rows[0];
    if (!row) return fail(res, 404, 1, '记录不存在');

    let detail = row.detail;
    if (typeof detail === 'string') {
      try { detail = JSON.parse(detail); } catch { /* keep string */ }
    }

    ok(res, {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      detail,
      clientIp: row.client_ip,
      channel: row.channel,
      createTime: row.create_time,
    });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '读取详情失败');
  }
});
