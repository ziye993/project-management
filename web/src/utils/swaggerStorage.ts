import type { DocTab } from '../type/docTab'
import { createTabLabel } from '../type/docTab'
import type { OpenAPISpec } from '../type/openapi'

const SESSION_KEY = 'swagger_session'
const HISTORY_KEY = 'swagger_history'
const MAX_HISTORY = 20

export interface SwaggerSession {
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
