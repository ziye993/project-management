import type { DocTab } from '../type/docTab'
import type { OpenAPISpec, Operation, PathItem, SchemaObject } from '../type/openapi'
import { getResponseJsonSchema, isFetchableSourceUrl, resolveSchema } from './openapi'
import { createTabLabel } from '../type/docTab'
import { normalizeDocDocumentType } from '../constants/docDocumentType'

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

export type EndpointDiffKind = 'method' | 'request' | 'response'

export interface EndpointDiffItem {
  path: string
  method: string
  /** 差异类别：方法存在性 / 整体入参 / 整体出参 */
  kinds: EndpointDiffKind[]
  /** 人类可读说明，不含原始 JSON */
  summaries: string[]
}

export interface DocConflict {
  key: string
  label: string
  local: DocTab
  remote: DocTab
  diffs: EndpointDiffItem[]
}

export interface SwaggerMergePlan {
  /** 无冲突、可直接合并的结果预览（不含冲突项） */
  conflicts: DocConflict[]
  /** 仅本地有的文档 */
  localOnly: DocTab[]
  /** 仅服务端有的文档 */
  remoteOnly: DocTab[]
  /** 两边相同（可任选）的配对 */
  identical: Array<{ local: DocTab; remote: DocTab }>
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

function getRequestFingerprint(spec: OpenAPISpec, operation: Operation): string {
  const parameters = (operation.parameters ?? []).map((p) => ({
    name: p.name,
    in: p.in,
    required: !!p.required,
    schema: p.schema ? resolveSchema(spec, p.schema) : null,
  }))

  let body: SchemaObject | null = null
  if (operation.requestBody?.content) {
    const media =
      operation.requestBody.content['application/json'] ??
      Object.values(operation.requestBody.content)[0]
    if (media?.schema) {
      body = resolveSchema(spec, media.schema)
    }
  }

  return stableStringify({
    parameters,
    required: !!operation.requestBody?.required,
    body,
  })
}

function getResponseFingerprint(spec: OpenAPISpec, operation: Operation): string {
  const raw = getResponseJsonSchema(spec, operation)
  if (!raw) return ''
  return stableStringify(resolveSchema(spec, raw))
}

function collectOperations(spec: OpenAPISpec): Map<string, { path: string; method: string; operation: Operation }> {
  const map = new Map<string, { path: string; method: string; operation: Operation }>()
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method as keyof PathItem] as Operation | undefined
      if (!operation) continue
      map.set(`${method.toUpperCase()} ${path}`, { path, method: method.toUpperCase(), operation })
    }
  }
  return map
}

/** 粗粒度对比两份 OpenAPI：精确到接口方法 / 整体入参 / 整体出参 */
export function diffOpenApiSpecs(local: OpenAPISpec, remote: OpenAPISpec): EndpointDiffItem[] {
  const left = collectOperations(local)
  const right = collectOperations(remote)
  const keys = new Set([...left.keys(), ...right.keys()])
  const diffs: EndpointDiffItem[] = []

  for (const key of [...keys].sort()) {
    const l = left.get(key)
    const r = right.get(key)

    if (l && !r) {
      diffs.push({
        path: l.path,
        method: l.method,
        kinds: ['method'],
        summaries: [`${l.method} ${l.path}：仅本地存在`],
      })
      continue
    }
    if (!l && r) {
      diffs.push({
        path: r.path,
        method: r.method,
        kinds: ['method'],
        summaries: [`${r.method} ${r.path}：仅服务端存在`],
      })
      continue
    }
    if (!l || !r) continue

    const kinds: EndpointDiffKind[] = []
    const summaries: string[] = []

    const reqL = getRequestFingerprint(local, l.operation)
    const reqR = getRequestFingerprint(remote, r.operation)
    if (reqL !== reqR) {
      kinds.push('request')
      summaries.push(`${l.method} ${l.path}：整体入参不同`)
    }

    const resL = getResponseFingerprint(local, l.operation)
    const resR = getResponseFingerprint(remote, r.operation)
    if (resL !== resR) {
      kinds.push('response')
      summaries.push(`${l.method} ${l.path}：整体出参不同`)
    }

    if (kinds.length) {
      diffs.push({ path: l.path, method: l.method, kinds, summaries })
    }
  }

  return diffs
}

export function findConflictIndex(tabs: DocTab[], incoming: DocTab): number {
  if (incoming.id) {
    const byId = tabs.findIndex((tab) => tab.id === incoming.id)
    if (byId >= 0) return byId
  }
  if (isFetchableSourceUrl(incoming.sourceUrl)) {
    return tabs.findIndex((tab) => tab.sourceUrl === incoming.sourceUrl)
  }
  return -1
}

function isSameDocContent(a: DocTab, b: DocTab): boolean {
  if (normalizeDocDocumentType(a.documentType) !== normalizeDocDocumentType(b.documentType)) {
    return false
  }
  if ((a.remark ?? '') !== (b.remark ?? '')) return false
  if ((a.cookie ?? '') !== (b.cookie ?? '')) return false
  if (a.sourceUrl !== b.sourceUrl) return false
  return stableStringify(a.spec) === stableStringify(b.spec)
}

function conflictLabel(local: DocTab, remote: DocTab): string {
  return (
    local.remark?.trim() ||
    remote.remark?.trim() ||
    local.label ||
    remote.label ||
    createTabLabel(local.spec, local.sourceUrl, local.remark)
  )
}

/** 分析本地与服务端 tabs，找出冲突 / 仅一侧 / 完全相同 */
export function analyzeSwaggerMerge(localTabs: DocTab[], remoteTabs: DocTab[]): SwaggerMergePlan {
  const usedRemote = new Set<number>()
  const conflicts: DocConflict[] = []
  const identical: SwaggerMergePlan['identical'] = []
  const localOnly: DocTab[] = []

  for (const local of localTabs) {
    const remoteIndex = findConflictIndex(remoteTabs, local)
    if (remoteIndex < 0) {
      localOnly.push(local)
      continue
    }
    usedRemote.add(remoteIndex)
    const remote = remoteTabs[remoteIndex]
    if (isSameDocContent(local, remote)) {
      identical.push({ local, remote })
      continue
    }

    const diffs = diffOpenApiSpecs(local.spec, remote.spec)
    if (
      diffs.length === 0 &&
      normalizeDocDocumentType(local.documentType) !== normalizeDocDocumentType(remote.documentType)
    ) {
      diffs.push({
        path: '',
        method: '',
        kinds: ['method'],
        summaries: [
          `文档类型不同：本地 ${normalizeDocDocumentType(local.documentType)} / 服务端 ${normalizeDocDocumentType(remote.documentType)}`,
        ],
      })
    }
    if (diffs.length === 0 && (local.remark ?? '') !== (remote.remark ?? '')) {
      diffs.push({
        path: '',
        method: '',
        kinds: ['method'],
        summaries: ['备注不同'],
      })
    }
    if (diffs.length === 0 && (local.cookie ?? '') !== (remote.cookie ?? '')) {
      diffs.push({
        path: '',
        method: '',
        kinds: ['method'],
        summaries: ['Cookie 不同'],
      })
    }
    if (diffs.length === 0) {
      diffs.push({
        path: '',
        method: '',
        kinds: ['method'],
        summaries: ['文档内容有差异（接口结构之外）'],
      })
    }

    conflicts.push({
      key: local.id || remote.id || local.sourceUrl,
      label: conflictLabel(local, remote),
      local,
      remote,
      diffs,
    })
  }

  const remoteOnly = remoteTabs.filter((_, index) => !usedRemote.has(index))

  return { conflicts, localOnly, remoteOnly, identical }
}

export type ConflictChoice = 'local' | 'remote'

/** 按用户选择生成最终 tabs，并统一用于本地与服务端 */
export function resolveSwaggerMerge(
  plan: SwaggerMergePlan,
  choices: Record<string, ConflictChoice>,
): DocTab[] {
  const resolved: DocTab[] = []

  for (const pair of plan.identical) {
    resolved.push({
      ...pair.local,
      documentType: normalizeDocDocumentType(pair.local.documentType),
    })
  }

  for (const tab of plan.localOnly) {
    resolved.push({
      ...tab,
      documentType: normalizeDocDocumentType(tab.documentType),
    })
  }

  for (const tab of plan.remoteOnly) {
    resolved.push({
      ...tab,
      id: tab.id || `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: createTabLabel(tab.spec, tab.sourceUrl, tab.remark),
      documentType: normalizeDocDocumentType(tab.documentType),
    })
  }

  for (const conflict of plan.conflicts) {
    const choice = choices[conflict.key] ?? 'local'
    const picked = choice === 'remote' ? conflict.remote : conflict.local
    // 保留本地 id，避免激活态与引用断裂
    resolved.push({
      ...picked,
      id: conflict.local.id,
      label: createTabLabel(picked.spec, picked.sourceUrl, picked.remark),
      documentType: normalizeDocDocumentType(picked.documentType),
    })
  }

  return resolved
}
