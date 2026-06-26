import type { SchemaObject } from '../type/openapi'

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
