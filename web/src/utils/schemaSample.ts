import type { MockFieldDefaults } from '../type/mockDefaults'
import type { OpenAPISpec, Operation, SchemaObject } from '../type/openapi'
import { resolveFieldDefault } from './fieldDefaults'
import { resolveSchema } from './openapi'

export function schemaToSample(
  spec: OpenAPISpec,
  schema: SchemaObject,
  depth = 0,
  globalDefaults?: MockFieldDefaults | null,
  path = '',
): unknown {
  if (depth > 12) return null

  const resolved = resolveSchema(spec, schema)

  const configured = resolveFieldDefault(path, globalDefaults, resolved)
  if (configured !== undefined) return configured

  if (resolved.enum?.length) {
    return resolved.enum[0]
  }

  if (resolved.allOf?.length) {
    const merged: Record<string, unknown> = {}
    for (const part of resolved.allOf) {
      const sample = schemaToSample(spec, part, depth + 1, globalDefaults, path)
      if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
        Object.assign(merged, sample)
      }
    }
    return merged
  }

  if (resolved.oneOf?.length) {
    return schemaToSample(spec, resolved.oneOf[0], depth + 1, globalDefaults, path)
  }

  if (resolved.anyOf?.length) {
    return schemaToSample(spec, resolved.anyOf[0], depth + 1, globalDefaults, path)
  }

  switch (resolved.type) {
    case 'string':
      if (resolved.format === 'date-time') return ''
      if (resolved.format === 'date') return ''
      return ''
    case 'integer':
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'array':
      if (resolved.items) {
        const itemPath = path ? `${path}[]` : '[]'
        return [schemaToSample(spec, resolved.items, depth + 1, globalDefaults, itemPath)]
      }
      return []
    case 'object':
    default:
      if (resolved.properties) {
        const obj: Record<string, unknown> = {}
        for (const [key, prop] of Object.entries(resolved.properties)) {
          const childPath = path ? `${path}.${key}` : key
          obj[key] = schemaToSample(spec, prop, depth + 1, globalDefaults, childPath)
        }
        return obj
      }
      return {}
  }
}

export function formatJsLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null'

  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `[${value.map((item) => formatJsLiteral(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const props = entries.map(([key, val]) => `${key}:${formatJsLiteral(val)}`)
    return `{${props.join(',')},}`
  }

  return 'null'
}

export function getRequestBodySample(
  spec: OpenAPISpec,
  operation: Operation,
  globalDefaults?: MockFieldDefaults | null,
): unknown | null {
  if (!operation.requestBody?.content) return null

  const jsonContent =
    operation.requestBody.content['application/json'] ??
    Object.values(operation.requestBody.content)[0]

  if (!jsonContent?.schema) return null

  return schemaToSample(spec, jsonContent.schema, 0, globalDefaults)
}

export function getParametersSample(
  spec: OpenAPISpec,
  operation: Operation,
  globalDefaults?: MockFieldDefaults | null,
): Record<string, unknown> | null {
  if (!operation.parameters?.length) return null

  const params: Record<string, unknown> = {}
  for (const param of operation.parameters) {
    const resolvedSchema = param.schema ? resolveSchema(spec, param.schema) : undefined
    const configured = resolveFieldDefault(param.name, globalDefaults, resolvedSchema)
    if (configured !== undefined) {
      params[param.name] = configured
    } else if (param.schema) {
      params[param.name] = schemaToSample(spec, param.schema, 0, globalDefaults, param.name)
    } else {
      params[param.name] = ''
    }
  }

  return Object.keys(params).length ? params : null
}

export function buildApiUrl(serverUrl: string, path: string): string {
  const base = serverUrl.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}
