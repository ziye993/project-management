import { useMemo, useState } from 'react'
import type { OpenAPISpec, ParsedEndpoint } from '../../type/openapi'
import {
  countEndpoints,
  filterEndpoints,
  groupEndpointsByTag,
} from '../../utils/openapi'
import { endpointRouteKey } from '../../utils/dataMockStorage'
import styles from './index.module.less'

const METHOD_COLORS: Record<string, string> = {
  get: styles.methodGet,
  post: styles.methodPost,
  put: styles.methodPut,
  delete: styles.methodDelete,
  patch: styles.methodPatch,
}

interface EndpointPickerProps {
  spec: OpenAPISpec
  selected: ParsedEndpoint | null
  runningKeys: Set<string>
  onSelect: (endpoint: ParsedEndpoint) => void
}

export function EndpointPicker({ spec, selected, runningKeys, onSelect }: EndpointPickerProps) {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allGroups = useMemo(() => groupEndpointsByTag(spec), [spec])
  const filteredGroups = useMemo(
    () => filterEndpoints(allGroups, search),
    [allGroups, search],
  )

  const tags = Array.from(filteredGroups.keys())
  const totalCount = countEndpoints(allGroups)
  const displayTag = activeTag && filteredGroups.has(activeTag) ? activeTag : tags[0] ?? null
  const displayEndpoints = displayTag ? filteredGroups.get(displayTag) ?? [] : []

  return (
    <div className={styles.pickerPanel}>
      <header className={styles.pickerHeader}>
        <strong>{spec.info.title}</strong>
        <span className={styles.versionBadge}>v{spec.info.version}</span>
        <span className={styles.pickerMeta}>{totalCount} 个接口 · 选择一项用于 Mock</span>
      </header>

      <div className={styles.docToolbar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="搜索路径、摘要…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.docLayout}>
        <nav className={styles.tagSidebar}>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`${styles.tagBtn} ${displayTag === tag ? styles.active : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              <span className={styles.tagName}>{tag}</span>
              <span className={styles.tagCount}>{filteredGroups.get(tag)?.length}</span>
            </button>
          ))}
        </nav>

        <main className={styles.endpointList}>
          {displayTag && <h3 className={styles.tagHeading}>{displayTag}</h3>}
          {displayEndpoints.map((ep) => {
            const isSelected =
              selected?.path === ep.path && selected?.method === ep.method
            const methodClass = METHOD_COLORS[ep.method] ?? styles.methodDefault
            const isMocking = runningKeys.has(endpointRouteKey(ep.method, ep.path))

            return (
              <button
                key={`${ep.method}-${ep.path}`}
                type="button"
                className={`${styles.endpointPickItem} ${isSelected ? styles.selected : ''} ${isMocking ? styles.mocking : ''}`}
                onClick={() => onSelect(ep)}
              >
                <span className={`${styles.methodBadge} ${methodClass}`}>
                  {ep.method.toUpperCase()}
                </span>
                <div className={styles.endpointPickMain}>
                  <code className={styles.endpointPath}>{ep.path}</code>
                  <span className={styles.endpointSummary}>
                    {ep.operation.summary ?? ep.operation.description ?? ep.operation.operationId ?? '—'}
                  </span>
                </div>
                {isMocking && <span className={styles.mockingBadge}>Mock</span>}
              </button>
            )
          })}
        </main>
      </div>
    </div>
  )
}
