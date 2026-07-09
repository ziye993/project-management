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

const PAGINATION_CONFIG = {
  pageNo: ['pageNo', 'pageNum', 'current', 'page'] as const,
  pageSize: ['pageSize', 'size'] as const,
  total: ['total'] as const,
}

type PaginationConfigKey = keyof typeof PAGINATION_CONFIG

function getPathLeaf(path: string): string {
  const parts = path.split('.')
  return parts[parts.length - 1] ?? path
}

function resolvePaginationDefault(
  path: string,
  defaults: MockFieldDefaults | null | undefined,
  schema?: SchemaObject,
): unknown | undefined {
  const pagination = defaults?.pagination
  if (!pagination || typeof pagination !== 'object') return undefined

  const leaf = getPathLeaf(path)
  for (const configKey of Object.keys(PAGINATION_CONFIG) as PaginationConfigKey[]) {
    if (!(PAGINATION_CONFIG[configKey] as readonly string[]).includes(leaf)) continue
    const value = pagination[configKey]
    if (isConfigured(value)) return coerceNumber(value, schema)
  }

  return undefined
}

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

  const paginated = resolvePaginationDefault(path, defaults, schema)
  if (paginated !== undefined) return paginated

  return undefined
}

/** Swagger 试请求：先精确路径，再尝试顶层分页参数别名（如 query 参数 pageNo） */
export function resolveFieldDefault(
  path: string,
  defaults: MockFieldDefaults | null | undefined,
  schema?: SchemaObject,
): unknown | undefined {
  const exact = resolveGlobalFieldDefault(path, defaults, schema)
  if (exact !== undefined) return exact

  if (defaults?.pagination && path && !path.includes('.')) {
    return resolvePaginationDefault(path, defaults, schema)
  }

  return undefined
}
