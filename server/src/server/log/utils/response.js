export function ok(res, data, msg = '') {
  res.json({ success: true, code: 0, msg, data });
}

export function fail(res, httpStatus, code, msg) {
  res.status(httpStatus).json({ success: false, code, msg, data: null });
}

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
