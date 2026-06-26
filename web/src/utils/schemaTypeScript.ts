import type { OpenAPISpec, Operation, SchemaObject } from '../type/openapi'
import { getRefName, getResponseJsonSchema, resolveSchema } from './openapi'

function toPascalCase(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

export function pathToInterfaceName(path: string, suffix: 'In' | 'Out'): string {
  const parts = path
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        return toPascalCase(segment.slice(1, -1))
      }
      return toPascalCase(segment)
    })

  return `I${parts.join('')}${suffix}`
}

function schemaToTsType(spec: OpenAPISpec, schema: SchemaObject, depth = 0): string {
  if (depth > 12) return 'unknown'

  if (schema.$ref) {
    return getRefName(schema.$ref)
  }

  const resolved = resolveSchema(spec, schema)

  if (resolved.enum?.length) {
    return resolved.enum
      .map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v)))
      .join(' | ')
  }

  if (resolved.oneOf?.length) {
    return resolved.oneOf.map((s) => schemaToTsType(spec, s, depth + 1)).join(' | ')
  }

  if (resolved.anyOf?.length) {
    return resolved.anyOf.map((s) => schemaToTsType(spec, s, depth + 1)).join(' | ')
  }

  if (resolved.allOf?.length) {
    return resolved.allOf.map((s) => schemaToTsType(spec, s, depth + 1)).join(' & ')
  }

  if (resolved.type === 'array' && resolved.items) {
    return `${schemaToTsType(spec, resolved.items, depth + 1)}[]`
  }

  switch (resolved.type) {
    case 'string':
      return 'string'
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
    default:
      if (resolved.properties) {
        return formatInlineObject(spec, resolved.properties, resolved.required ?? [], depth + 1)
      }
      if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
        return `Record<string, ${schemaToTsType(spec, resolved.additionalProperties, depth + 1)}>`
      }
      return 'Record<string, unknown>'
  }
}

function formatInlineObject(
  spec: OpenAPISpec,
  properties: Record<string, SchemaObject>,
  required: string[],
  depth: number,
): string {
  const requiredSet = new Set(required)
  const lines = Object.entries(properties).map(([key, prop]) => {
    const optional = requiredSet.has(key) ? '' : '?'
    return `${key}${optional}: ${schemaToTsType(spec, prop, depth)};`
  })

  if (lines.length === 0) return 'Record<string, unknown>'
  return `{ ${lines.join(' ')} }`
}

function formatInterfaceLines(
  spec: OpenAPISpec,
  properties: Record<string, SchemaObject>,
  required: string[],
): string[] {
  const requiredSet = new Set(required)
  return Object.entries(properties).map(([key, prop]) => {
    const optional = requiredSet.has(key) ? '' : '?'
    return `  ${key}${optional}: ${schemaToTsType(spec, prop, 0)};`
  })
}

function mergeAllOfProperties(
  spec: OpenAPISpec,
  schema: SchemaObject,
): { properties: Record<string, SchemaObject>; required: string[] } | null {
  const resolved = resolveSchema(spec, schema)
  if (!resolved.allOf?.length) return null

  const properties: Record<string, SchemaObject> = {}
  const required: string[] = []

  for (const part of resolved.allOf) {
    const r = resolveSchema(spec, part)
    if (r.properties) Object.assign(properties, r.properties)
    for (const name of r.required ?? []) {
      if (!required.includes(name)) required.push(name)
    }
  }

  return Object.keys(properties).length ? { properties, required } : null
}

function schemaToInterfaceLines(
  spec: OpenAPISpec,
  schema: SchemaObject,
): string[] | null {
  const resolved = resolveSchema(spec, schema)

  const merged = mergeAllOfProperties(spec, schema)
  if (merged) {
    return formatInterfaceLines(spec, merged.properties, merged.required)
  }

  if (resolved.properties) {
    return formatInterfaceLines(spec, resolved.properties, resolved.required ?? [])
  }

  if (resolved.$ref) {
    return [`  data: ${getRefName(resolved.$ref)};`]
  }

  const type = schemaToTsType(spec, schema)
  if (type === 'Record<string, unknown>') return null
  return [`  data: ${type};`]
}

function getRequestBodySchema(operation: Operation): SchemaObject | null {
  if (!operation.requestBody?.content) return null

  const jsonContent =
    operation.requestBody.content['application/json'] ??
    Object.values(operation.requestBody.content)[0]

  return jsonContent?.schema ?? null
}

function collectInputProperties(
  spec: OpenAPISpec,
  operation: Operation,
): { properties: Record<string, SchemaObject>; required: string[] } {
  const properties: Record<string, SchemaObject> = {}
  const required: string[] = []

  for (const param of operation.parameters ?? []) {
    properties[param.name] = param.schema ?? { type: 'string' }
    if (param.required) required.push(param.name)
  }

  const bodySchema = getRequestBodySchema(operation)
  if (bodySchema) {
    const merged = mergeAllOfProperties(spec, bodySchema)
    const resolved = resolveSchema(spec, bodySchema)

    if (merged) {
      Object.assign(properties, merged.properties)
      for (const name of merged.required) {
        if (!required.includes(name)) required.push(name)
      }
    } else if (resolved.properties) {
      Object.assign(properties, resolved.properties)
      for (const name of resolved.required ?? []) {
        if (!required.includes(name)) required.push(name)
      }
    } else {
      properties.body = bodySchema
      if (operation.requestBody?.required) required.push('body')
    }
  }

  return { properties, required }
}

function buildInterface(name: string, lines: string[]): string {
  if (lines.length === 0) return `interface ${name} {}`
  return `interface ${name} {\n${lines.join('\n')}\n}`
}

export function getRequestTsInterface(
  spec: OpenAPISpec,
  path: string,
  operation: Operation,
): string | null {
  const { properties, required } = collectInputProperties(spec, operation)
  if (Object.keys(properties).length === 0) return null

  const lines = formatInterfaceLines(spec, properties, required)
  return buildInterface(pathToInterfaceName(path, 'In'), lines)
}

function getResponse200Schema(spec: OpenAPISpec, operation: Operation): SchemaObject | null {
  return getResponseJsonSchema(spec, operation)
}

export function getResponse200TsInterface(
  spec: OpenAPISpec,
  path: string,
  operation: Operation,
): string | null {
  const schema = getResponse200Schema(spec, operation)
  if (!schema) return null

  const lines = schemaToInterfaceLines(spec, schema)
  if (!lines?.length) return null

  return buildInterface(pathToInterfaceName(path, 'Out'), lines)
}
