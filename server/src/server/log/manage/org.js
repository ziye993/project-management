import app from '../../../app.js';
import bcrypt from 'bcrypt';
import pool from '../../../db/logDb.js';
import { fail, ok } from '../utils/response.js';
import { authenticateToken, requireSuperAdmin, auditLog } from '../../../middleware/auth.js';
import { assertOrgCapability, assertOrgReadable, getAccessibleOrgIds } from '../utils/permissions.js';
import { bootstrapTenantAdmin } from '../../../auth/grants.js';
import { PRESET_TENANT_ADMIN } from '../../../auth/capabilities.js';

app.post('/api/log/manage/org/list', authenticateToken, async (req, res) => {
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

    const accessible = await getAccessibleOrgIds(req);
    if (accessible !== null) {
      if (!accessible.length) {
        return ok(res, { list: [], total: 0, page: p, pageSize: ps });
      }
      conditions.push(`o.id IN (${accessible.map(() => '?').join(',')})`);
      params.push(...accessible);
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

app.post('/api/log/manage/org/detail', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');
    if (!assertOrgReadable(req, id) && !assertOrgCapability(req, 'log.org.read', id)) {
      return fail(res, 403, 2, '无权访问该组织');
    }

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

app.post('/api/log/manage/org/create', authenticateToken, requireSuperAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      org_name,
      contact_name,
      contact_phone,
      remark,
      bootstrapUser,
    } = req.body || {};

    if (!org_name || !String(org_name).trim()) {
      return fail(res, 400, 1, 'org_name 必填');
    }
    if (!bootstrapUser || typeof bootstrapUser !== 'object') {
      return fail(res, 400, 1, 'bootstrapUser 必填');
    }

    await conn.beginTransaction();

    const [orgResult] = await conn.execute(
      `INSERT INTO sys_org (org_name, contact_name, contact_phone, remark)
       VALUES (?, ?, ?, ?)`,
      [org_name.trim(), contact_name || null, contact_phone || null, remark || null],
    );
    const orgId = orgResult.insertId;

    let bootstrapUserId = null;
    if (bootstrapUser.userId) {
      const [users] = await conn.execute(
        'SELECT id, status FROM sys_user WHERE id = ?',
        [bootstrapUser.userId],
      );
      if (!users.length || users[0].status !== 1) {
        throw Object.assign(new Error('bootstrap 用户不存在或已禁用'), { http: 400 });
      }
      bootstrapUserId = users[0].id;
    } else {
      const { username, password, email } = bootstrapUser;
      if (!username?.trim() || !password) {
        throw Object.assign(new Error('bootstrapUser 需提供 username+password 或 userId'), { http: 400 });
      }
      const hash = await bcrypt.hash(password, 10);
      try {
        const [userResult] = await conn.execute(
          'INSERT INTO sys_user (username, password_hash, email) VALUES (?, ?, ?)',
          [username.trim(), hash, email || null],
        );
        bootstrapUserId = userResult.insertId;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          throw Object.assign(new Error('bootstrap 用户名已存在'), { http: 400 });
        }
        throw err;
      }
    }

    await bootstrapTenantAdmin(conn, {
      userId: bootstrapUserId,
      orgId,
      grantedBy: req.user.id,
    });

    await conn.commit();

    await auditLog(req, 'org.create', 'org', orgId, {
      org_name,
      bootstrapUserId,
    });
    await auditLog(req, 'grant.bootstrap', 'org', orgId, {
      orgId,
      userId: bootstrapUserId,
      preset: PRESET_TENANT_ADMIN,
    });

    ok(res, { id: orgId, bootstrapUserId });
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    if (err.http === 400) return fail(res, 400, 1, err.message);
    console.error('[org/create]', err);
    fail(res, 500, 9, '数据库异常');
  } finally {
    conn.release();
  }
});

app.post('/api/log/manage/org/update', authenticateToken, async (req, res) => {
  try {
    const { id, org_name, contact_name, contact_phone, remark, status } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');
    if (!assertOrgCapability(req, 'log.org.update', id)) {
      return fail(res, 403, 2, '无权修改该组织');
    }
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
    await auditLog(req, 'org.update', 'org', id, { org_name });
    ok(res, { id });
  } catch (err) {
    console.error('[org/update]', err);
    fail(res, 500, 9, '数据库异常');
  }
});

app.post('/api/log/manage/org/toggleStatus', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return fail(res, 400, 1, '缺少 id 参数');
    if (!assertOrgCapability(req, 'log.org.update', id)) {
      return fail(res, 403, 2, '无权修改该组织');
    }

    const [result] = await pool.execute(
      'UPDATE sys_org SET status = IF(status = 1, 0, 1) WHERE id = ?',
      [id],
    );
    if (result.affectedRows === 0) return fail(res, 400, 1, '组织不存在');

    const [rows] = await pool.execute('SELECT status FROM sys_org WHERE id = ?', [id]);
    await auditLog(req, 'org.toggleStatus', 'org', id, { status: rows[0].status });
    ok(res, { id, status: rows[0].status });
  } catch (err) {
    console.error('[org/toggleStatus]', err);
    fail(res, 500, 9, '数据库异常');
  }
});
