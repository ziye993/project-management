import type { OpenAPISpec } from './openapi'

export interface DocTab {
  id: string
  label: string
  sourceUrl: string
  spec: OpenAPISpec
  /** Document-level Cookie header value for try requests */
  cookie?: string
}

export function createTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createTabLabel(spec: OpenAPISpec, sourceUrl: string): string {
  const title = spec.info.title || '未命名 API'

  if (sourceUrl === '本地粘贴的 JSON') {
    return `${title} (粘贴)`
  }

  try {
    const parts = sourceUrl.split('/v3/api-docs/')
    if (parts.length > 1) {
      const group = decodeURIComponent(parts[1].split('?')[0])
      return `${title} · ${group}`
    }
  } catch {
    // ignore
  }

  return title
}

export function createDocTab(spec: OpenAPISpec, sourceUrl: string, cookie = ''): DocTab {
  return {
    id: createTabId(),
    label: createTabLabel(spec, sourceUrl),
    sourceUrl,
    spec,
    cookie,
  }
}
