import type { MockFieldDefaults } from '../type/mockDefaults'
import type { SchemaObject } from '../type/openapi'

function isConfigured(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

function coerceNumber(value: unknown, schema?: SchemaObject): unknown {
  const n = Number(value)
  if (Number.isNaN(n)) return value
  return schema?.type === 'integer' ? Math.trunc(n) : n
}

function coerceBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

const RESULT_KEYS = ['size', 'total', 'current', 'pages'] as const

/** 与 server mock fieldDefaults 一致：按字段路径匹配系统配置默认值 */
export function resolveGlobalFieldDefault(
  path: string,
  defaults: MockFieldDefaults | null | undefined,
  schema?: SchemaObject,
): unknown | undefined {
  if (!defaults || !path || path.includes('[]')) return undefined

  if (path === 'code' && isConfigured(defaults.code)) {
    return coerceNumber(defaults.code, schema)
  }

  if (path === 'success' && isConfigured(defaults.success)) {
    return coerceBoolean(defaults.success)
  }

  if ((path === 'msg' || path === 'message') && isConfigured(defaults.message)) {
    return String(defaults.message)
  }

  const resultDefaults = defaults.result
  if (resultDefaults && typeof resultDefaults === 'object') {
    for (const key of RESULT_KEYS) {
      if (path === `result.${key}` && isConfigured(resultDefaults[key])) {
        return coerceNumber(resultDefaults[key], schema)
      }
    }
  }

  return undefined
}

/** Swagger 试请求：先精确路径，再尝试 result.{name} 别名（如 query 参数 current → result.current） */
export function resolveFieldDefault(
  path: string,
  defaults: MockFieldDefaults | null | undefined,
  schema?: SchemaObject,
): unknown | undefined {
  const exact = resolveGlobalFieldDefault(path, defaults, schema)
  if (exact !== undefined) return exact

  if (defaults?.result && path && !path.includes('.')) {
    if ((RESULT_KEYS as readonly string[]).includes(path)) {
      return resolveGlobalFieldDefault(`result.${path}`, defaults, schema)
    }
  }

  return undefined
}
