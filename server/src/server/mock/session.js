/** 多 Mock 会话；按 baseUrl 端口在 localhost 上监听（与目标服务同端口，仅 IP 不同）。 */

export function parseBaseUrl(baseUrl) {
  try {
    const u = new URL(baseUrl);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    return {
      port: Number(port),
      contextPath: u.pathname.replace(/\/+$/, '') || '',
      mockHost: '127.0.0.1',
    };
  } catch {
    return { port: 80, contextPath: '', mockHost: '127.0.0.1' };
  }
}

export function extractContextPath(baseUrl) {
  return parseBaseUrl(baseUrl).contextPath;
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

export function buildMockUrl(baseUrl, openApiPath) {
  const { port, contextPath, mockHost } = parseBaseUrl(baseUrl);
  const mockPath = buildMockPath(contextPath, openApiPath);
  const examplePath = buildExamplePath(mockPath);
  return `http://${mockHost}:${port}${examplePath}`;
}

export function buildMockBaseUrl(baseUrl) {
  const { port, contextPath, mockHost } = parseBaseUrl(baseUrl);
  const cp = contextPath.startsWith('/') ? contextPath : contextPath ? `/${contextPath}` : '';
  return `http://${mockHost}:${port}${cp}`;
}

export function routeKey(method, openApiPath) {
  return `${String(method).toLowerCase()}:${openApiPath}`;
}

export function createSessionPayload({
  mockId,
  method,
  openApiPath,
  baseUrl,
  fieldRules = {},
  arrayLengths = {},
  responseSchema,
  sourceUrl = '',
}) {
  const { port, contextPath } = parseBaseUrl(baseUrl);
  const mockPath = buildMockPath(contextPath, openApiPath);
  return {
    mockId,
    method: String(method).toLowerCase(),
    openApiPath,
    baseUrl,
    sourceUrl,
    port,
    contextPath,
    mockPath,
    pathRegex: buildPathRegex(mockPath),
    fieldRules,
    arrayLengths,
    responseSchema,
    startedAt: Date.now(),
  };
}

export function toPublicSession(session) {
  return {
    mockId: session.mockId,
    method: session.method,
    path: session.openApiPath,
    baseUrl: session.baseUrl,
    sourceUrl: session.sourceUrl,
    mockPath: session.mockPath,
    mockUrl: buildMockUrl(session.baseUrl, session.openApiPath),
    mockBaseUrl: buildMockBaseUrl(session.baseUrl),
    port: session.port,
    startedAt: session.startedAt,
  };
}
