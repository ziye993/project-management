import { useMemo, useState } from 'react'
import type { OpenAPISpec } from '../../../type/openapi'
import {
  countEndpoints,
  filterEndpoints,
  groupEndpointsByTag,
} from '../../../utils/openapi'
import { EndpointCard } from './EndpointCard'
import styles from './index.module.less'

interface ApiDocViewerProps {
  spec: OpenAPISpec
  sourceUrl: string
}

export function ApiDocViewer({ spec, sourceUrl }: ApiDocViewerProps) {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [infoExpanded, setInfoExpanded] = useState(false)

  const allGroups = useMemo(() => groupEndpointsByTag(spec), [spec])
  const filteredGroups = useMemo(
    () => filterEndpoints(allGroups, search),
    [allGroups, search],
  )

  const tags = Array.from(filteredGroups.keys())
  const totalCount = countEndpoints(allGroups)
  const filteredCount = countEndpoints(filteredGroups)

  const displayTag = activeTag && filteredGroups.has(activeTag) ? activeTag : tags[0] ?? null
  const displayEndpoints = displayTag ? filteredGroups.get(displayTag) ?? [] : []

  return (
    <div className={styles.docViewer}>
      <header className={styles.apiInfo}>
        <button
          type="button"
          className={styles.apiInfoToggle}
          onClick={() => setInfoExpanded(!infoExpanded)}
          aria-expanded={infoExpanded}
        >
          <span className={styles.apiInfoSummary}>
            <strong>{spec.info.title}</strong>
            <span className={styles.versionBadge}>v{spec.info.version}</span>
            <span className={styles.apiInfoMeta}>{totalCount} 个接口</span>
          </span>
          <span className={styles.expandIcon}>{infoExpanded ? '▾' : '▸'}</span>
        </button>

        {infoExpanded && (
          <div className={styles.apiInfoBody}>
            {spec.info.description && (
              <p className={styles.apiDescription}>{spec.info.description}</p>
            )}
            {spec.servers?.[0] && (
              <div className={styles.serverUrl}>
                <span className={styles.detailLabel}>服务地址</span>
                <code>{spec.servers[0].url}</code>
              </div>
            )}
            <div className={styles.serverUrl}>
              <span className={styles.detailLabel}>文档来源</span>
              <code>{sourceUrl}</code>
            </div>
            <div className={styles.stats}>
              <span>{totalCount} 个接口</span>
              <span>{allGroups.size} 个分组</span>
            </div>
          </div>
        )}
      </header>

      <div className={styles.docToolbar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="搜索路径、摘要、Operation ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <span className={styles.searchHint}>
            找到 {filteredCount} 个匹配接口
          </span>
        )}
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
          {tags.length === 0 && (
            <p className={styles.emptyHint}>无匹配结果</p>
          )}
        </nav>

        <main className={styles.endpointList}>
          {displayTag && (
            <h3 className={styles.tagHeading}>{displayTag}</h3>
          )}
          {displayEndpoints.map((ep) => (
            <EndpointCard
              key={`${ep.method}-${ep.path}`}
              spec={spec}
              endpoint={ep}
              serverUrl={spec.servers?.[0]?.url}
            />
          ))}
        </main>
      </div>
    </div>
  )
}
