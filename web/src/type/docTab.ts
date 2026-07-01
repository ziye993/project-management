import type { OpenAPISpec } from './openapi'

export interface DocTab {
  id: string
  label: string
  sourceUrl: string
  spec: OpenAPISpec
  /** Document-level Cookie header value for try requests */
  cookie?: string
  /** User-defined tab remark; shown in tab bar when set */
  remark?: string
}

export function createTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function getDocBaseUrl(sourceUrl: string): string {
  if (sourceUrl === '本地粘贴的 JSON') return sourceUrl

  try {
    const parts = sourceUrl.split('/v3/api-docs/')
    if (parts.length > 1) return parts[0]
  } catch {
    // ignore
  }

  return sourceUrl
}

export function createTabLabel(spec: OpenAPISpec, sourceUrl: string, remark?: string): string {
  const trimmed = remark?.trim()
  if (trimmed) return trimmed

  const baseUrl = getDocBaseUrl(sourceUrl)
  if (baseUrl !== '本地粘贴的 JSON') return baseUrl

  const title = spec.info.title || '未命名 API'
  return sourceUrl === '本地粘贴的 JSON' ? `${title} (粘贴)` : title
}

export function createDocTab(
  spec: OpenAPISpec,
  sourceUrl: string,
  cookie = '',
  remark = '',
): DocTab {
  return {
    id: createTabId(),
    label: createTabLabel(spec, sourceUrl, remark),
    sourceUrl,
    spec,
    cookie,
    remark: remark || undefined,
  }
}
