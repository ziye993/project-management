import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../../db/logDb.js';
import { JWT_SECRET } from '../../config/deployment.js';
import { getClientIp } from '../../middleware/access.js';
import {
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginAttempts,
} from '../../utils/loginRateLimit.js';
import { loadUserPermissions } from '../../middleware/auth.js';
import { sendVerificationCode } from './maill.js';
import { decryptLoginPassword, getPasswordPublicKey } from '../../utils/passwordCrypto.js';

const JWT_EXPIRES = '7d';

function isSecureRequest(req) {
  return req.secure === true || req.headers['x-forwarded-proto'] === 'https';
}

function setToken(res, req, user) {
  const token = jwt.sign(
    { id: user.id, username: user.username, is_super_admin: !!user.is_super_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecureRequest(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_super_admin: !!user.is_super_admin,
  };
}

export const getPublicKey = (req, res) => {
  res.status(200).json({
    success: true,
    code: 0,
    msg: 'success',
    data: { publicKey: getPasswordPublicKey() },
  });
};

export const login = async (req, res) => {
  try {
    const { username, password, encrypted } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, code: 1, msg: '请输入用户名和密码', data: null });
    }

    let plainPassword = password;
    if (encrypted) {
      try {
        plainPassword = decryptLoginPassword(password);
      } catch {
        return res.status(400).json({ success: false, code: 1, msg: '密码解密失败', data: null });
      }
    }

    const ip = getClientIp(req);
    const rateCheck = checkLoginRateLimit(ip, username);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        code: 'LOGIN_RATE_LIMITED',
        msg: '登录失败次数过多，请15分钟后再试',
        data: null,
      });
    }

    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, email, status, is_super_admin FROM sys_user WHERE username = ?',
      [username],
    );
    const user = rows[0];
    if (!user || user.status !== 1) {
      recordLoginFailure(ip, username);
      return res.status(200).json({ success: false, code: 1, msg: '用户名或密码错误', data: null });
    }

    const match = await bcrypt.compare(plainPassword, user.password_hash);

      const hash = await bcrypt.hash('123456', 10);
      console.log('hash', hash, 'plainPassword',plainPassword,'user?.password_hash', user?.password_hash);
    if (!match) {
      recordLoginFailure(ip, username);
      return res.status(200).json({ success: false, code: 1, msg: '用户名或密码错误', data: null });
    }

    clearLoginAttempts(ip, username);
    setToken(res, req, user);
    const perms = await loadUserPermissions(user.id);

    return res.status(200).json({
      success: true,
      code: 0,
      msg: 'success',
      data: {
        ...sanitizeUser(user),
        orgPermissions: perms.orgPermissions,
        projectPermissions: perms.projectPermissions,
      },
    });
  } catch (error) {
    console.error('[login]', error);
    return res.status(500).json({ success: false, code: 2, msg: '登录失败', data: null });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
  });
  res.status(200).json({ success: true, code: 0, msg: '已退出', data: null });
};

export const me = async (req, res) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, code: 'NOT_TOKEN', msg: '未登录', data: null });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.execute(
      'SELECT id, username, email, status, is_super_admin FROM sys_user WHERE id = ?',
      [payload.id],
    );
    const user = rows[0];
    if (!user || user.status !== 1) {
      return res.status(403).json({ success: false, code: 'INVALID_USER', msg: '用户无效', data: null });
    }

    const perms = await loadUserPermissions(user.id);
    return res.status(200).json({
      success: true,
      code: 0,
      msg: '',
      data: {
        ...sanitizeUser(user),
        orgPermissions: perms.orgPermissions,
        projectPermissions: perms.projectPermissions,
      },
    });
  } catch {
    return res.status(403).json({ success: false, code: 'INVALID_TOKEN', msg: '无效令牌', data: null });
  }
};

export const sendEmailCode = async (req, res) => {
  if (!req.body?.email) {
    return res.status(400).json({ success: false, code: 1, msg: 'not Email', data: null });
  }
  const data = await sendVerificationCode(req.body.email);
  res.status(200).json({ ...data, code: data.success ? 0 : 2, success: data.success });
};
