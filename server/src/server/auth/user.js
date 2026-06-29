import bcrypt from 'bcrypt';
import pool from '../../db/logDb.js';
import { auditLog } from '../../middleware/auth.js';

export async function listUsers(req, res) {
  try {
    const { username, status, page = 1, pageSize = 20 } = req.body || {};
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const conditions = [];
    const params = [];
    if (username) {
      conditions.push('username LIKE ?');
      params.push(`%${username}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      conditions.push('status = ?');
      params.push(parseInt(status, 10));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM sys_user ${where}`,
      params,
    );

    const [rows] = await pool.execute(
      `SELECT id, username, email, status, is_super_admin, create_time, update_time
       FROM sys_user ${where}
       ORDER BY id DESC
       LIMIT ${ps} OFFSET ${offset}`,
      params,
    );

    res.json({
      success: true, code: 0, msg: '',
      data: { list: rows, total: countRows[0].total, page: p, pageSize: ps },
    });
  } catch (err) {
    console.error('[auth/user/list]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}

export async function createUser(req, res) {
  try {
    const { username, password, email } = req.body || {};
    if (!username?.trim() || !password) {
      return res.status(400).json({ success: false, code: 1, msg: '用户名和密码必填', data: null });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO sys_user (username, password_hash, email) VALUES (?, ?, ?)',
      [username.trim(), hash, email || null],
    );

    await auditLog(req, 'user.create', 'user', result.insertId, { username });
    res.json({ success: true, code: 0, msg: '', data: { id: result.insertId } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, code: 1, msg: '用户名已存在', data: null });
    }
    console.error('[auth/user/create]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}

export async function updateUser(req, res) {
  try {
    const { id, email, status } = req.body || {};
    if (!id) return res.status(400).json({ success: false, code: 1, msg: '缺少 id', data: null });

    const [result] = await pool.execute(
      'UPDATE sys_user SET email = ?, status = ? WHERE id = ?',
      [email ?? null, status !== undefined ? parseInt(status, 10) : 1, id],
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, code: 1, msg: '用户不存在', data: null });
    }

    await auditLog(req, 'user.update', 'user', id, { email, status });
    res.json({ success: true, code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error('[auth/user/update]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}

export async function resetPassword(req, res) {
  try {
    const { id, password } = req.body || {};
    if (!id || !password) {
      return res.status(400).json({ success: false, code: 1, msg: '缺少参数', data: null });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'UPDATE sys_user SET password_hash = ? WHERE id = ?',
      [hash, id],
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, code: 1, msg: '用户不存在', data: null });
    }

    await auditLog(req, 'user.resetPassword', 'user', id);
    res.json({ success: true, code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error('[auth/user/resetPassword]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}

export async function grantOrg(req, res) {
  try {
    const { userId, orgId, role = 'view' } = req.body || {};
    if (!userId || !orgId) {
      return res.status(400).json({ success: false, code: 1, msg: '缺少参数', data: null });
    }

    await pool.execute(
      `INSERT INTO sys_user_org (user_id, org_id, role) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [userId, orgId, role],
    );

    await auditLog(req, 'grant.org', 'user_org', `${userId}:${orgId}`, { role });
    res.json({ success: true, code: 0, msg: '', data: null });
  } catch (err) {
    console.error('[auth/grant/org]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}

export async function grantProject(req, res) {
  try {
    const { userId, projectId, role = 'view' } = req.body || {};
    if (!userId || !projectId) {
      return res.status(400).json({ success: false, code: 1, msg: '缺少参数', data: null });
    }

    await pool.execute(
      `INSERT INTO sys_user_project (user_id, project_id, role) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [userId, projectId, role],
    );

    await auditLog(req, 'grant.project', 'user_project', `${userId}:${projectId}`, { role });
    res.json({ success: true, code: 0, msg: '', data: null });
  } catch (err) {
    console.error('[auth/grant/project]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}

export async function revokeGrant(req, res) {
  try {
    const { userId, orgId, projectId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, code: 1, msg: '缺少 userId', data: null });

    if (orgId) {
      await pool.execute('DELETE FROM sys_user_org WHERE user_id = ? AND org_id = ?', [userId, orgId]);
      await auditLog(req, 'grant.revoke', 'user_org', `${userId}:${orgId}`);
    } else if (projectId) {
      await pool.execute('DELETE FROM sys_user_project WHERE user_id = ? AND project_id = ?', [userId, projectId]);
      await auditLog(req, 'grant.revoke', 'user_project', `${userId}:${projectId}`);
    } else {
      return res.status(400).json({ success: false, code: 1, msg: '缺少 orgId 或 projectId', data: null });
    }

    res.json({ success: true, code: 0, msg: '', data: null });
  } catch (err) {
    console.error('[auth/grant/revoke]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}

export async function listGrants(req, res) {
  try {
    const userId = req.query?.userId || req.body?.userId;
    if (!userId) return res.status(400).json({ success: false, code: 1, msg: '缺少 userId', data: null });

    const [orgRows] = await pool.execute(
      `SELECT uo.org_id AS orgId, uo.role, o.org_name AS orgName
       FROM sys_user_org uo
       LEFT JOIN sys_org o ON o.id = uo.org_id
       WHERE uo.user_id = ?`,
      [userId],
    );

    const [projectRows] = await pool.execute(
      `SELECT up.project_id AS projectId, up.role, p.project_name AS projectName, p.org_id AS orgId
       FROM sys_user_project up
       LEFT JOIN sys_project p ON p.id = up.project_id
       WHERE up.user_id = ?`,
      [userId],
    );

    res.json({
      success: true, code: 0, msg: '',
      data: { orgGrants: orgRows, projectGrants: projectRows },
    });
  } catch (err) {
    console.error('[auth/grant/list]', err);
    res.status(500).json({ success: false, code: 9, msg: '数据库异常', data: null });
  }
}
