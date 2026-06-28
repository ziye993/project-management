import app from '../../app.js';
import pool from '../../db/logDb.js';
import { hashApiKey, isValidLevel, validateKeyPrefix } from './utils/keyHash.js';
import { fail, getClientIp, ok } from './utils/response.js';

app.post('/api/log/postLog', async (req, res) => {
  try {
    const body = req.body || {};
    const { key, content, module, title, traceId, data } = body;
    let { level } = body;

    if (!key || !validateKeyPrefix(key)) {
      return fail(res, 400, 1, 'key 必填且必须以 sk_ 开头');
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return fail(res, 400, 1, 'content 必填且不能为空');
    }

    level = (level || 'INFO').toUpperCase();
    if (!isValidLevel(level)) {
      return fail(res, 400, 1, 'level 必须是 DEBUG、INFO、WARN、ERROR、FATAL 之一');
    }

    if (module != null && String(module).length > 100) {
      return fail(res, 400, 1, 'module 最长 100 字符');
    }
    if (title != null && String(title).length > 200) {
      return fail(res, 400, 1, 'title 最长 200 字符');
    }
    if (traceId != null && String(traceId).length > 64) {
      return fail(res, 400, 1, 'traceId 最长 64 字符');
    }

    let dataJson = null;
    if (data !== undefined && data !== null) {
      if (typeof data === 'object') {
        dataJson = JSON.stringify(data);
      } else {
        return fail(res, 400, 1, 'data 必须是 JSON 对象');
      }
    }

    const apiKeyHash = hashApiKey(key);
    const clientIp = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);

    const [keyRows] = await pool.execute(
      `SELECT k.id AS api_key_id, k.project_id, k.status AS key_status, k.expire_time,
              p.org_id, p.status AS project_status,
              o.status AS org_status
       FROM sys_api_key k
       JOIN sys_project p ON p.id = k.project_id
       JOIN sys_org o ON o.id = p.org_id
       WHERE k.api_key = ?`,
      [apiKeyHash],
    );

    if (!keyRows.length) {
      return fail(res, 401, 2, 'API Key 不存在');
    }

    const row = keyRows[0];

    if (row.key_status !== 1) {
      return fail(res, 403, 3, 'API Key 已禁用');
    }
    if (row.expire_time && new Date(row.expire_time) < new Date()) {
      return fail(res, 403, 3, 'API Key 已过期');
    }
    if (row.project_status !== 1) {
      return fail(res, 403, 3, '项目已禁用');
    }
    if (row.org_status !== 1) {
      return fail(res, 403, 3, '组织已禁用');
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO sys_log
        (api_key_id, org_id, project_id, level, module, title, content, data, trace_id, client_ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.api_key_id,
        row.org_id,
        row.project_id,
        level,
        module || null,
        title || null,
        content,
        dataJson,
        traceId || null,
        clientIp || null,
        userAgent || null,
      ],
    );

    await pool.execute(
      'UPDATE sys_api_key SET last_used_time = NOW(), last_ip = ? WHERE id = ?',
      [clientIp || null, row.api_key_id],
    );

    ok(res, { logId: insertResult.insertId });
  } catch (err) {
    console.error('[postLog]', err);
    fail(res, 500, 9, '数据库异常');
  }
});
