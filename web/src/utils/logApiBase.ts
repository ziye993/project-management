/** 解析有效的日志/认证 API 基址（与 accessContext 逻辑一致） */
export function resolveEffectiveLogApiBaseUrl(configured?: string) {
  if (typeof window === 'undefined') return configured || 'http://127.0.0.1:30014';
  const local = window.location.origin;
  if (!configured) return local;
  try {
    const configuredOrigin = new URL(configured).origin;
    return configuredOrigin || local;
  } catch {
    return local;
  }
}

export function isSameOriginBase(baseUrl: string) {
  if (typeof window === 'undefined') return true;
  try {
    return new URL(baseUrl).origin === window.location.origin;
  } catch {
    return true;
  }
}
