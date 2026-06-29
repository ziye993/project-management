import { SERVER_PORT } from '../const.js';

export const DEPLOYMENT_ROLE = process.env.DEPLOYMENT_ROLE || 'local_agent';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
export const TRUST_PROXY = process.env.TRUST_PROXY || 'loopback';

/** 生产/跨域场景在 .env 中显式配置；未配置则运行时按当前请求 origin 解析 */
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
export const LOG_API_BASE_URL = process.env.LOG_API_BASE_URL || '';

export const isLogServer = () => DEPLOYMENT_ROLE === 'log_server';

export function resolveRequestBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers.host;
  if (forwardedProto && host) {
    return `${String(forwardedProto).split(',')[0].trim()}://${host}`;
  }
  const proto = req.secure ? 'https' : 'http';
  return `${proto}://${host || `127.0.0.1:${SERVER_PORT}`}`;
}

export function resolvePublicBaseUrl(req) {
  return PUBLIC_BASE_URL || resolveRequestBaseUrl(req);
}

export function resolveLogApiBaseUrl(req) {
  return LOG_API_BASE_URL || resolveRequestBaseUrl(req);
}
