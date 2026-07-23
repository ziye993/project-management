import type { DocTab } from '../type/docTab'
import { createTabId, createTabLabel } from '../type/docTab'
import type { OpenAPISpec } from '../type/openapi'
import { isFetchableSourceUrl } from './openapi'

const SESSION_KEY = 'swagger_session'
const HISTORY_KEY = 'swagger_history'
const SEARCH_KEY = 'swagger_search'
const MAX_HISTORY = 20
const EXPORT_VERSION = 1 as const

export interface SwaggerSession {
  tabs: DocTab[]
  activeTabId: string | null
}

export interface SwaggerExportPayload {
  version: typeof EXPORT_VERSION
  exportedAt: number
  tabs: DocTab[]
  activeTabId: string | null
}

export interface SwaggerHistoryEntry {
  sourceUrl: string
  baseUrl: string
  group: string
  label: string
  loadedAt: number
}

export function loadSwaggerSearch(): string {
  try {
    return localStorage.getItem(SEARCH_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveSwaggerSearch(query: string) {
  try {
    localStorage.setItem(SEARCH_KEY, query)
  } catch {
    /* quota exceeded — ignore */
  }
}

export function loadSwaggerSession(): SwaggerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SwaggerSession
    if (!Array.isArray(parsed.tabs)) return null
    return {
      tabs: parsed.tabs,
      activeTabId: parsed.activeTabId ?? null,
    }
  } catch {
    return null
  }
}

export function saveSwaggerSession(tabs: DocTab[], activeTabId: string | null) {
  const session: SwaggerSession = { tabs, activeTabId }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* quota exceeded — ignore */
  }
}

export function loadSwaggerHistory(): SwaggerHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SwaggerHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addSwaggerHistory(
  spec: OpenAPISpec,
  sourceUrl: string,
  baseUrl: string,
  group: string,
): SwaggerHistoryEntry[] {
  if (sourceUrl === '本地粘贴的 JSON') return loadSwaggerHistory()

  const entry: SwaggerHistoryEntry = {
    sourceUrl,
    baseUrl,
    group,
    label: createTabLabel(spec, sourceUrl),
    loadedAt: Date.now(),
  }

  const prev = loadSwaggerHistory().filter((h) => h.sourceUrl !== sourceUrl)
  const next = [entry, ...prev].slice(0, MAX_HISTORY)

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }

  return next
}

export function removeSwaggerHistory(sourceUrl: string): SwaggerHistoryEntry[] {
  const next = loadSwaggerHistory().filter((h) => h.sourceUrl !== sourceUrl)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function buildSwaggerExport(
  tabs: DocTab[],
  activeTabId: string | null,
): SwaggerExportPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    tabs,
    activeTabId,
  }
}

export function parseSwaggerImport(raw: string): SwaggerExportPayload {
  const data = JSON.parse(raw) as Partial<SwaggerExportPayload>
  if (!Array.isArray(data.tabs)) {
    throw new Error('无效的配置文件：缺少 tabs')
  }

  const tabs = data.tabs.filter(
    (tab): tab is DocTab =>
      !!tab &&
      typeof tab === 'object' &&
      typeof tab.sourceUrl === 'string' &&
      !!tab.spec &&
      typeof tab.spec === 'object',
  )

  if (!tabs.length) {
    throw new Error('无效的配置文件：没有可用的文档数据')
  }

  return {
    version: EXPORT_VERSION,
    exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : Date.now(),
    tabs: tabs.map((tab) => ({
      ...tab,
      id: typeof tab.id === 'string' && tab.id ? tab.id : createTabId(),
      label:
        typeof tab.label === 'string' && tab.label
          ? tab.label
          : createTabLabel(tab.spec, tab.sourceUrl, tab.remark),
    })),
    activeTabId: typeof data.activeTabId === 'string' ? data.activeTabId : null,
  }
}

/** 与当前 tabs 合并：同 id，或可拉取文档的同 sourceUrl 视为冲突，导入数据优先 */
export function mergeSwaggerTabs(current: DocTab[], imported: DocTab[]): DocTab[] {
  const result = current.map((tab) => ({ ...tab }))

  for (const incoming of imported) {
    const conflictIndex = findConflictIndex(result, incoming)
    if (conflictIndex >= 0) {
      const existing = result[conflictIndex]
      result[conflictIndex] = {
        ...incoming,
        // 保留当前 tab id，避免激活态丢失；其余字段（备注、cookie、spec 等）以导入为准
        id: existing.id,
        label: createTabLabel(incoming.spec, incoming.sourceUrl, incoming.remark),
      }
    } else {
      result.push({
        ...incoming,
        id: incoming.id || createTabId(),
        label: createTabLabel(incoming.spec, incoming.sourceUrl, incoming.remark),
      })
    }
  }

  return result
}

function findConflictIndex(tabs: DocTab[], incoming: DocTab): number {
  if (incoming.id) {
    const byId = tabs.findIndex((tab) => tab.id === incoming.id)
    if (byId >= 0) return byId
  }
  if (isFetchableSourceUrl(incoming.sourceUrl)) {
    return tabs.findIndex((tab) => tab.sourceUrl === incoming.sourceUrl)
  }
  return -1
}

export function downloadSwaggerExport(payload: SwaggerExportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date(payload.exportedAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')
  a.href = url
  a.download = `swagger-config-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}
