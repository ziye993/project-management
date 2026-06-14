/**
 * 修复 multipart 上传时 UTF-8 文件名被误读为 latin1 的乱码
 */
export function fixFilenameEncoding(name) {
  if (!name || typeof name !== 'string') return name;
  if (/[\u3400-\u9fff\uf900-\ufaff]/.test(name)) return name;

  try {
    const fixed = Buffer.from(name, 'latin1').toString('utf8');
    if (fixed.includes('\uFFFD')) return name;
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(fixed)) return fixed;
  } catch {
    // ignore
  }
  return name;
}

export function fixStoredFilename(storedName) {
  const match = storedName.match(/^(\d+)-(.+)$/);
  if (!match) return fixFilenameEncoding(storedName);
  return `${match[1]}-${fixFilenameEncoding(match[2])}`;
}

export function encodeUrlPath(base, filename) {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${prefix}/${encodeURIComponent(filename)}`;
}

export function encodeUrlPathRelative(base, relativePath) {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  const encoded = String(relativePath || '')
    .split('/')
    .filter(Boolean)
    .map(seg => encodeURIComponent(seg))
    .join('/');
  return encoded ? `${prefix}/${encoded}` : prefix;
}
