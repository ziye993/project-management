import { buildApiUrl } from './schemaSample'

export interface SwaggerRequestOptions {
  url: string
  method: string
  cookie?: string
  body?: unknown
}

export interface SwaggerRequestResult {
  status: number
  statusText: string
  body: string
  ok: boolean
}

function extractPathParamNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
}

export function buildSwaggerRequestUrl(
  serverUrl: string,
  path: string,
  params: Record<string, unknown>,
): string {
  let finalPath = path
  const query: Record<string, unknown> = {}
  const pathParamNames = extractPathParamNames(path)

  for (const [key, value] of Object.entries(params)) {
    if (pathParamNames.includes(key)) {
      finalPath = finalPath.replace(`{${key}}`, encodeURIComponent(String(value ?? '')))
    } else if (value !== undefined && value !== null && value !== '') {
      query[key] = value
    }
  }

  let url = buildApiUrl(serverUrl, finalPath)
  const qs = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        qs.append(key, String(item))
      }
    } else {
      qs.set(key, String(value))
    }
  }

  const queryString = qs.toString()
  if (queryString) {
    url += (url.includes('?') ? '&' : '?') + queryString
  }

  return url
}

export async function sendSwaggerRequest(
  options: SwaggerRequestOptions,
): Promise<SwaggerRequestResult> {
  const method = options.method.toUpperCase()
  const hasBody = options.body !== undefined && !['GET', 'HEAD'].includes(method)

  const response = await fetch('/openapi-api-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: options.url,
      method,
      cookie: options.cookie || undefined,
      body: hasBody ? options.body : undefined,
    }),
  })

  const text = await response.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(text || '代理响应解析失败')
  }

  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    throw new Error(String((parsed as { error: unknown }).error))
  }

  return parsed as SwaggerRequestResult
}

export function formatResponseBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}
