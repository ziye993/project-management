/** 文档类型；当前仅启用 swagger，其它值预留扩展 */
export const DOC_DOCUMENT_TYPES = ['swagger'] as const

export type DocDocumentType = (typeof DOC_DOCUMENT_TYPES)[number]

export const DEFAULT_DOC_DOCUMENT_TYPE: DocDocumentType = 'swagger'

export const DOC_DOCUMENT_TYPE_LABELS: Record<DocDocumentType, string> = {
  swagger: 'Swagger',
}

/** 类型圆点颜色；未识别类型走默认灰 */
export const DOC_DOCUMENT_TYPE_COLORS: Record<string, string> = {
  swagger: '#3b82f6',
  openapi: '#10b981',
  postman: '#f97316',
  apifox: '#a855f7',
  graphql: '#e11d48',
}

export const DOC_DOCUMENT_TYPE_FALLBACK_COLOR = '#94a3b8'

export function normalizeDocDocumentType(value: unknown): DocDocumentType {
  if (typeof value === 'string' && (DOC_DOCUMENT_TYPES as readonly string[]).includes(value)) {
    return value as DocDocumentType
  }
  return DEFAULT_DOC_DOCUMENT_TYPE
}

export function getDocDocumentTypeColor(type: string | undefined): string {
  if (!type) return DOC_DOCUMENT_TYPE_COLORS[DEFAULT_DOC_DOCUMENT_TYPE]
  return DOC_DOCUMENT_TYPE_COLORS[type] ?? DOC_DOCUMENT_TYPE_FALLBACK_COLOR
}

export function getDocDocumentTypeLabel(type: string | undefined): string {
  const normalized = normalizeDocDocumentType(type)
  return DOC_DOCUMENT_TYPE_LABELS[normalized] ?? type ?? '未知'
}
