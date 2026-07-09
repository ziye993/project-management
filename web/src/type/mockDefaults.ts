export interface MockPaginationDefaults {
  pageNo?: number | string
  pageSize?: number | string
  total?: number | string
}

export interface MockFieldDefaults {
  code?: number | string
  success?: boolean | string
  message?: string
  pagination?: MockPaginationDefaults
}

export const EMPTY_MOCK_FIELD_DEFAULTS: MockFieldDefaults = {
  code: '',
  success: '',
  message: '',
  pagination: {
    pageNo: '',
    pageSize: '',
    total: '',
  },
}

/** 兼容旧版 result.{current,size,pages,total} 配置 */
export function mockFieldDefaultsFromConfig(
  raw?: (MockFieldDefaults & { result?: Record<string, unknown> }) | null,
): MockFieldDefaults {
  const pagination = raw?.pagination ?? {}
  const legacy = raw?.result ?? {}
  const legacyVal = (key: string) => {
    const v = legacy[key]
    return v === undefined || v === null ? '' : (v as number | string)
  }
  return {
    code: raw?.code ?? '',
    success: raw?.success ?? '',
    message: raw?.message ?? '',
    pagination: {
      pageNo: pagination.pageNo ?? (legacyVal('pageNo') || legacyVal('current')),
      pageSize: pagination.pageSize ?? (legacyVal('pageSize') || legacyVal('size')),
      total: pagination.total ?? legacyVal('total'),
    },
  }
}
