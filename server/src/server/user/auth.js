import jwt from 'jsonwebtoken';
import db from "../../db/index.js";
import {veriCodeToEmail, sendVerificationCode} from "./maill.js";

const jwtKey = 'ziye993';

const excludeRouter = ["/user/login", "/user/sendEmailCode"];

// 生成 JWT 令牌
function generateToken(user, time) {
  return jwt.sign(
    user,
    jwtKey, // 生产环境应使用环境变量存储密钥
    {expiresIn: time || '7d'}
  );
}

// 验证令牌的中间件
export function authenticateToken(req, res, next) {
  if (excludeRouter.includes(req.url)) {
    next();
    return;
  }
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).json({data: null, code: 'NOT_TOKEN', msg: '未提供令牌', success: false});
  }

  jwt.verify(token, jwtKey, (err, user) => {
    if (err) {
      return res.status(403).json({data: null, code: 'INVALID_TOKEN', msg: '无效令牌', success: false});
    }
    req.user = user;
    next();
  });
}

const setToken = (res, info, time) => {
  const defaultTime = time || 1000 * 60 * 60 * 24 * 7
  const token = generateToken(info, Math.floor(time / 1000));
  res.cookie('token', token, {
    httpOnly: true, // 防止XSS
    // secure: process.env.NODE_ENV === 'production', // 仅在HTTPS连接中发送cookie
    maxAge: defaultTime, // 7 天
    sameSite: 'lax',  // lax 可以跨域发送 POST 请求
    // sameSite: 'strict' // 防止CSRF
    secure: false
  });
}

export const loginToToken = async (req, res) => {
  if (req.user) {
    const [userInfo] = await db.select('select * from ziyeUser where id = @id', {id: req.user.id});
    if (!userInfo) return res.status(200).json({data: null, msg: "登陆失败", code: 1, success: false});
    setToken(res, userInfo);
    res.status(200).json({
      success: true,
      message: 'success',
      code: 0,
      data: {username: userInfo.username, email: userInfo.email, id: userInfo.id}
    })
  }
}

export const login = async (req, res) => {
  try {
    const {username, password, email, code} = req.body;
    if (!username || !password) { // 非空验证
      return res.status(400).json({message: '认证失败,请输入用户名和密码！', code: 3});
    }
    if (email && !code) { //注册，但是没有验证码
      return res.status(400).json({message: '认证失败,请输入验证码！', code: 4});
    }
    if (email && code && username && password) { // 注册，或者更新密码
      const emailRes = veriCodeToEmail(email, code);
      if (emailRes.code === 0) {  // 修改 密码
        const [userInfo] = await db.select("select * from ziyeUser where username = @username and email = @email", {
          email,
          username
        });
        if (!userInfo) [userInfo] =await db.add('ziyeUser', {username, password, email});
        else await db.update('ziyeUser', {username}, {password});
        setToken(res, userInfo);
        return res.status(200).json({
          message: 'success',
          code: 0,
          success: true,
          data: {username: userInfo.username, email: userInfo.email, id: userInfo.id}
        })
      }
      return res.status(400).json({message: '认证失败，验证码错误', code: 6});
    }
    if (username && password && !email) { //登陆
      const [userInfo] = await db.select('select * from ziyeUser where username = @username and password = @password', {username, password});
      if (userInfo) {
        setToken(res, userInfo);
        return res.status(200).json({
          message: 'success',
          code: 0,
          success: true,
          data: {username: userInfo.username, email: userInfo.email, id: userInfo.id}
        })
      }
      return res.status(200).json({message: '用户名或密码错误！', code: 1})
    }
    return res.status(400).json({message: '认证失败', code: 2});
  } catch (error) {
    return res.status(500).json({message: '登录失败', error: error.message, code: 2});
  }
}

export const sendEmailCode = async (req, res) => {
  if (!req.body.email) {
    res.status(400).json({message: 'not Email', code: 1});
    return
  }
  const data = await sendVerificationCode(req.body.email);
  res.status(200).json({...data, code: data.success ? 0 : 2, success: data.success});
}

