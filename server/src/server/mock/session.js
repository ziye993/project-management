/** MVP: only one mock session at a time; starting a new mock stops the previous one. */
let activeSession = null;

export function getActiveSession() {
  return activeSession;
}

export function setActiveSession(session) {
  activeSession = session;
}

export function clearActiveSession() {
  activeSession = null;
}

export function extractContextPath(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return u.pathname.replace(/\/+$/, '') || '';
  } catch {
    const trimmed = String(baseUrl || '').replace(/\/+$/, '');
    if (trimmed.startsWith('/')) return trimmed;
    return '';
  }
}

export function buildMockPath(contextPath, openApiPath) {
  const cp = contextPath.startsWith('/') ? contextPath : contextPath ? `/${contextPath}` : '';
  const pp = openApiPath.startsWith('/') ? openApiPath : `/${openApiPath}`;
  if (!cp) return pp;
  return `${cp}${pp}`.replace(/\/+/g, '/');
}

export function buildPathRegex(fullPath) {
  const segments = fullPath.split('/').filter(Boolean);
  const pattern = segments
    .map((seg) => {
      if (/^\{[^}]+\}$/.test(seg)) return '[^/]+';
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('\\/');
  return new RegExp(`^/${pattern}$`);
}

export function buildExamplePath(fullPath) {
  return fullPath.replace(/\{[^}]+\}/g, '1');
}
