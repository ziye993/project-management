import type { ArrayLengthsMap, FieldRulesMap } from './mockRules'

const RULES_KEY = 'dataMockEndpointRules'

export interface MockSessionInfo {
  mockId: string
  method: string
  path: string
  baseUrl: string
  sourceUrl?: string
  mockPath: string
  mockUrl: string
  mockBaseUrl?: string
  port: number
  startedAt: number
}

type EndpointRulesStore = Record<
  string,
  { fieldRules: FieldRulesMap; arrayLengths: ArrayLengthsMap; staticResponseText?: string }
>

function endpointKey(sourceUrl: string, method: string, path: string) {
  return `${sourceUrl}|${method.toLowerCase()}|${path}`
}

function loadStore(): EndpointRulesStore {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as EndpointRulesStore
  } catch {
    return {}
  }
}

function saveStore(store: EndpointRulesStore) {
  localStorage.setItem(RULES_KEY, JSON.stringify(store))
}

export function loadEndpointRules(sourceUrl: string, method: string, path: string) {
  const store = loadStore()
  return store[endpointKey(sourceUrl, method, path)] ?? null
}

export function saveEndpointRules(
  sourceUrl: string,
  method: string,
  path: string,
  fieldRules: FieldRulesMap,
  arrayLengths: ArrayLengthsMap,
  staticResponseText = '',
) {
  const store = loadStore()
  store[endpointKey(sourceUrl, method, path)] = { fieldRules, arrayLengths, staticResponseText }
  saveStore(store)
}

export function parseStaticResponseText(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string,value:unknown } | { ok: true; empty: true,value:unknown } {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true, empty: true ,value: undefined }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch {
    return { ok: false, error: 'JSON 格式无效',value: undefined }
  }
}

export function endpointRouteKey(method: string, path: string) {
  return `${method.toLowerCase()}:${path}`
}

export function findRunningMock(
  running: MockSessionInfo[],
  method: string,
  path: string,
  baseUrl?: string,
) {
  return running.find(
    (m) =>
      m.method.toLowerCase() === method.toLowerCase() &&
      m.path === path &&
      (!baseUrl || m.baseUrl === baseUrl),
  )
}
