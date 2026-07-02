export function ok(res, data, msg = '') {
  res.json({ success: true, code: 0, msg, data });
}

export function fail(res, httpStatus, code, msg, data = null) {
  res.status(httpStatus).json({ success: false, code, msg, data });
}
