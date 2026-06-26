import type {
  OpenAPISpec,
  Operation,
  ParsedEndpoint,
  PathItem,
  SchemaObject,
  MediaType,
  Response,
} from '../type/openapi'

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

export function buildApiDocsUrl(baseUrl: string, group = '应用'): string {
  const normalized = baseUrl.replace(/\/+$/, '')
  return `${normalized}/v3/api-docs/${encodeURIComponent(group)}`
}

export function parseApiDocsUrl(docsUrl: string): { baseUrl: string; group: string } | null {
  try {
    const parts = docsUrl.split('/v3/api-docs/')
    if (parts.length !== 2) return null
    const group = decodeURIComponent(parts[1].split('?')[0])
    return { baseUrl: parts[0], group }
  } catch {
    return null
  }
}

export function isFetchableSourceUrl(sourceUrl: string): boolean {
  return sourceUrl !== '本地粘贴的 JSON' && /^https?:\/\//i.test(sourceUrl)
}

export async function fetchOpenAPISpec(url: string): Promise<OpenAPISpec> {
  const fetchUrl = import.meta.env.DEV
    ? `/openapi-proxy?url=${encodeURIComponent(url)}`
    : url

  const response = await fetch(fetchUrl)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `请求失败 (${response.status}): ${response.statusText}${detail ? ` — ${detail.slice(0, 120)}` : ''}`,
    )
  }
  return response.json()
}

export function parseOpenAPISpec(json: string): OpenAPISpec {
  const data = JSON.parse(json) as OpenAPISpec
  if (!data.openapi || !data.paths) {
    throw new Error('无效的 OpenAPI 文档：缺少 openapi 或 paths 字段')
  }
  return data
}

export function groupEndpointsByTag(spec: OpenAPISpec): Map<string, ParsedEndpoint[]> {
  const groups = new Map<string, ParsedEndpoint[]>()

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method as keyof PathItem] as Operation | undefined
      if (!operation) continue

      const tags = operation.tags?.length ? operation.tags : ['未分类']
      for (const tag of tags) {
        if (!groups.has(tag)) groups.set(tag, [])
        groups.get(tag)!.push({ path, method, operation })
      }
    }
  }

  return groups
}

export function resolveRef(spec: OpenAPISpec, ref: string): SchemaObject | undefined {
  if (!ref.startsWith('#/')) return undefined
  const parts = ref.slice(2).split('/')
  let current: unknown = spec
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current as SchemaObject
}

export function resolveSchema(spec: OpenAPISpec, schema: SchemaObject, depth = 0): SchemaObject {
  if (depth > 10) return schema

  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref)
    if (resolved) {
      return { ...resolveSchema(spec, resolved, depth + 1), description: schema.description ?? resolved.description }
    }
  }

  const result = { ...schema }

  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([key, value]) => [
        key,
        resolveSchema(spec, value, depth + 1),
      ]),
    )
  }

  if (result.items) {
    result.items = resolveSchema(spec, result.items, depth + 1)
  }

  if (result.allOf) {
    result.allOf = result.allOf.map((s) => resolveSchema(spec, s, depth + 1))
  }

  if (result.oneOf) {
    result.oneOf = result.oneOf.map((s) => resolveSchema(spec, s, depth + 1))
  }

  if (result.anyOf) {
    result.anyOf = result.anyOf.map((s) => resolveSchema(spec, s, depth + 1))
  }

  return result
}

export function getRefName(ref: string): string {
  const idx = ref.lastIndexOf('/')
  return idx >= 0 ? ref.slice(idx + 1) : ref
}

export function filterEndpoints(
  groups: Map<string, ParsedEndpoint[]>,
  query: string,
): Map<string, ParsedEndpoint[]> {
  const q = query.trim().toLowerCase()
  if (!q) return groups

  const filtered = new Map<string, ParsedEndpoint[]>()

  for (const [tag, endpoints] of groups) {
    const matched = endpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.operation.summary?.toLowerCase().includes(q) ||
        ep.operation.description?.toLowerCase().includes(q) ||
        ep.operation.operationId?.toLowerCase().includes(q) ||
        tag.toLowerCase().includes(q),
    )
    if (matched.length) filtered.set(tag, matched)
  }

  return filtered
}

export function countEndpoints(groups: Map<string, ParsedEndpoint[]>): number {
  let count = 0
  for (const endpoints of groups.values()) count += endpoints.length
  return count
}

function resolveResponse(spec: OpenAPISpec, response: Response): Response {
  const ref = (response as Response & { $ref?: string }).$ref
  if (!ref) return response

  const resolved = resolveRef(spec, ref)
  if (resolved && typeof resolved === 'object') {
    return resolved as unknown as Response
  }
  return response
}

function pickJsonContent(content: Record<string, MediaType>): MediaType | undefined {
  if (content['application/json']?.schema) return content['application/json']

  for (const [type, media] of Object.entries(content)) {
    if (type.includes('json') && media.schema) return media
  }

  if (content['*/*']?.schema) return content['*/*']

  return Object.values(content).find((c) => c.schema)
}

/** Extract 200/201/default response JSON schema (supports wildcard content type, $ref, charset suffix). */
export function getResponseJsonSchema(spec: OpenAPISpec, operation: Operation): SchemaObject | null {
  const raw =
    operation.responses['200'] ??
    operation.responses['201'] ??
    operation.responses.default

  if (!raw) return null

  const response = resolveResponse(spec, raw)
  if (!response.content) return null

  return pickJsonContent(response.content)?.schema ?? null
}

export interface MockableEndpoint {
  path: string
  method: string
  operation: Operation
  responseSchema: SchemaObject
}

export function collectMockableEndpoints(spec: OpenAPISpec): MockableEndpoint[] {
  const list: MockableEndpoint[] = []

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method as keyof typeof pathItem] as Operation | undefined
      if (!operation) continue
      const raw = getResponseJsonSchema(spec, operation)
      if (!raw) continue
      list.push({
        path,
        method,
        operation,
        responseSchema: resolveSchema(spec, raw),
      })
    }
  }

  return list
}
