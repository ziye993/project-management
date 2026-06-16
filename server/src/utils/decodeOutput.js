export function decodeOutput(data) {
  if (!Buffer.isBuffer(data)) {
    return String(data ?? '');
  }
  if (process.platform !== 'win32') {
    return data.toString('utf8');
  }

  try {
    return new TextDecoder('gbk').decode(data);
  } catch {
    return data.toString('utf8');
  }
}
