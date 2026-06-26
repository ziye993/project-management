export interface MockResultFieldDefaults {
  size?: number | string
  total?: number | string
  current?: number | string
  pages?: number | string
}

export interface MockFieldDefaults {
  code?: number | string
  success?: boolean | string
  message?: string
  result?: MockResultFieldDefaults
}

export const EMPTY_MOCK_FIELD_DEFAULTS: MockFieldDefaults = {
  code: '',
  success: '',
  message: '',
  result: {
    size: '',
    total: '',
    current: '',
    pages: '',
  },
}

export function mockFieldDefaultsFromConfig(raw?: MockFieldDefaults | null): MockFieldDefaults {
  const result = raw?.result ?? {}
  return {
    code: raw?.code ?? '',
    success: raw?.success ?? '',
    message: raw?.message ?? '',
    result: {
      size: result.size ?? '',
      total: result.total ?? '',
      current: result.current ?? '',
      pages: result.pages ?? '',
    },
  }
}
