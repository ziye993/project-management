import type { OpenAPISpec, SchemaObject } from '../type/openapi'
import { resolveSchema } from './openapi'

export type FieldRuleMode = 'default' | 'fixed' | 'random' | 'increment' | 'now' | 'timeOffset'

export interface FieldRule {
  mode: FieldRuleMode
  value?: string | number | boolean
  start?: number
  offsetHours?: number
}

export type FieldRulesMap = Record<string, FieldRule>
export type ArrayLengthsMap = Record<string, number>

export const DEFAULT_ARRAY_LENGTH = 5

export function joinFieldPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key
}

export function arrayItemsPath(arrayPath: string): string {
  return `${arrayPath}[]`
}

export function buildDefaultFieldRules(schema: SchemaObject): FieldRulesMap {
  const rules: FieldRulesMap = {}
  if (schema.properties?.code) {
    rules.code = { mode: 'fixed', value: 0 }
  }
  if (schema.properties?.msg) {
    rules.msg = { mode: 'fixed', value: '' }
  }
  return rules
}

export function buildDefaultArrayLengths(_schema: SchemaObject): ArrayLengthsMap {
  return {}
}

export function setFieldRule(
  rules: FieldRulesMap,
  path: string,
  rule: FieldRule | null,
): FieldRulesMap {
  const next = { ...rules }
  if (!rule || rule.mode === 'default') {
    delete next[path]
  } else {
    next[path] = rule
  }
  return next
}

export function setArrayLength(
  lengths: ArrayLengthsMap,
  arrayPath: string,
  length: number,
): ArrayLengthsMap {
  const key = arrayItemsPath(arrayPath)
  return { ...lengths, [key]: length }
}

export function getArrayLength(lengths: ArrayLengthsMap, arrayPath: string): number {
  return lengths[arrayItemsPath(arrayPath)] ?? DEFAULT_ARRAY_LENGTH
}

export function inferLeafType(schema: SchemaObject): string {
  if (schema.enum?.length) return 'enum'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'integer') return 'integer'
  if (schema.type === 'number') return 'number'
  if (schema.type === 'string') return 'string'
  return schema.type ?? 'any'
}

export function isPrimitiveSchema(schema: SchemaObject): boolean {
  const t = inferLeafType(schema)
  return t === 'string' || t === 'number' || t === 'integer' || t === 'boolean' || t === 'enum'
}

export function isObjectSchema(schema: SchemaObject): boolean {
  if (schema.properties && Object.keys(schema.properties).length > 0) return true
  if (schema.type === 'object' && !schema.items) return true
  return false
}

export function mergeAllOfSchema(spec: OpenAPISpec, schema: SchemaObject): SchemaObject {
  const resolved = resolveSchema(spec, schema)
  if (!resolved.allOf?.length) return resolved

  const merged: SchemaObject = { type: 'object', properties: {}, required: [] }
  for (const part of resolved.allOf) {
    const p = mergeAllOfSchema(spec, part)
    if (p.properties) {
      merged.properties = { ...merged.properties, ...p.properties }
    }
    if (p.required?.length) {
      merged.required = [...new Set([...(merged.required ?? []), ...p.required])]
    }
  }

  return {
    ...resolved,
    type: 'object',
    properties: merged.properties,
    required: merged.required,
    allOf: undefined,
  }
}

export function normalizeSchema(spec: OpenAPISpec, schema: SchemaObject): SchemaObject {
  let normalized = mergeAllOfSchema(spec, schema)
  if (normalized.oneOf?.length) {
    normalized = mergeAllOfSchema(spec, normalized.oneOf[0])
  } else if (normalized.anyOf?.length) {
    normalized = mergeAllOfSchema(spec, normalized.anyOf[0])
  }
  return normalized
}
