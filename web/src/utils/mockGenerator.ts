import type { SchemaObject } from '../type/openapi'
import type { ArrayLengthsMap, FieldRulesMap } from './mockRules'
import { DEFAULT_ARRAY_LENGTH } from './mockRules'

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomString() {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'mock', 'sample', 'test']
  return `${pickRandom(words)}_${Math.random().toString(36).slice(2, 8)}`
}

function randomNumber(type: string) {
  const n = Math.floor(Math.random() * 1000)
  return type === 'integer' ? n : Number((Math.random() * 1000).toFixed(2))
}

function randomBoolean() {
  return Math.random() > 0.5
}

function applyRule(
  rule: FieldRulesMap[string] | undefined,
  arrayIndex: number | null,
) {
  if (!rule || rule.mode === 'default' || rule.mode === 'random') return null
  if (rule.mode === 'fixed') return rule.value
  if (rule.mode === 'increment') {
    const start = typeof rule.start === 'number' ? rule.start : 1
    return start + (arrayIndex ?? 0)
  }
  if (rule.mode === 'now') return new Date().toISOString()
  if (rule.mode === 'timeOffset') {
    const hours = typeof rule.offsetHours === 'number' ? rule.offsetHours : 1
    const d = new Date()
    d.setHours(d.getHours() + (arrayIndex ?? 0) * hours)
    return d.toISOString()
  }
  return null
}

function randomValue(schema: SchemaObject, depth = 0): unknown {
  if (depth > 12) return null
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (schema.enum?.length) return pickRandom(schema.enum)

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return new Date().toISOString()
      if (schema.format === 'date') return new Date().toISOString().slice(0, 10)
      return randomString()
    case 'integer':
    case 'number':
      return randomNumber(schema.type)
    case 'boolean':
      return randomBoolean()
    case 'array':
      return []
    default:
      return {}
  }
}

function mergeAllOf(schemas: SchemaObject[]): SchemaObject {
  const merged: SchemaObject = { type: 'object', properties: {}, required: [] }
  for (const part of schemas) {
    if (part.properties) merged.properties = { ...merged.properties, ...part.properties }
    if (part.required) merged.required = [...new Set([...(merged.required ?? []), ...part.required])]
  }
  return merged
}

interface GenerateCtx {
  fieldRules: FieldRulesMap
  arrayLengths: ArrayLengthsMap
  path?: string
  arrayIndex?: number | null
}

function generateFromSchema(schema: SchemaObject, ctx: GenerateCtx): unknown {
  const { fieldRules, arrayLengths, path = '', arrayIndex = null } = ctx
  if (!schema || typeof schema !== 'object') return null

  if (schema.allOf?.length) return generateFromSchema(mergeAllOf(schema.allOf), ctx)
  if (schema.oneOf?.length) return generateFromSchema(schema.oneOf[0], ctx)
  if (schema.anyOf?.length) return generateFromSchema(schema.anyOf[0], ctx)

  const rule = fieldRules[path]
  const ruled = applyRule(rule, arrayIndex)
  if (ruled !== null) return ruled

  if (schema.type === 'array' || schema.items) {
    const key = path ? `${path}[]` : '[]'
    const length = arrayLengths[key] ?? DEFAULT_ARRAY_LENGTH
    const items: unknown[] = []
    for (let i = 0; i < length; i += 1) {
      items.push(
        generateFromSchema(schema.items ?? { type: 'object' }, {
          ...ctx,
          path: key,
          arrayIndex: i,
        }),
      )
    }
    return items
  }

  if (schema.properties || schema.type === 'object' || (!schema.type && schema.properties)) {
    const obj: Record<string, unknown> = {}
    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      const childPath = path ? `${path}.${key}` : key
      obj[key] = generateFromSchema(prop, { ...ctx, path: childPath, arrayIndex })
    }
    return obj
  }

  return randomValue(schema)
}

export function generateMockPreview(
  responseSchema: SchemaObject,
  fieldRules: FieldRulesMap,
  arrayLengths: ArrayLengthsMap,
): unknown {
  return generateFromSchema(responseSchema, { fieldRules, arrayLengths })
}
