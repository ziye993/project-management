export { ok, fail } from '../../../utils/httpResponse.js';

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}

export function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}…`;
}
