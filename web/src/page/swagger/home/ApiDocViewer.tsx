import { ReloadOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import type { MockFieldDefaults } from '../../../type/mockDefaults'
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
  cookie?: string
  onCookieChange?: (cookie: string) => void
  fieldDefaults?: MockFieldDefaults | null
  canRefresh?: boolean
  refreshing?: boolean
  onRefresh?: () => void
}

export function ApiDocViewer({
  spec,
  sourceUrl,
  cookie = '',
  onCookieChange,
  fieldDefaults,
  canRefresh = false,
  refreshing = false,
  onRefresh,
}: ApiDocViewerProps) {
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
        <div className={styles.cookieToolbar}>
          <label className={styles.cookieToolbarLabel} htmlFor="doc-cookie">
            Cookie
          </label>
          <input
            id="doc-cookie"
            type="text"
            className={styles.cookieToolbarInput}
            value={cookie}
            onChange={(e) => onCookieChange?.(e.target.value)}
            placeholder="sessionId=xxx; token=yyy"
            spellCheck={false}
            title="文档级别 Cookie，试请求时自动带上"
          />
        </div>
        {search && (
          <span className={styles.searchHint}>
            找到 {filteredCount} 个匹配接口
          </span>
        )}
        {canRefresh && onRefresh && (
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={refreshing}
            title="从服务端重新拉取最新文档"
          >
            <ReloadOutlined spin={refreshing} />
            {refreshing ? '刷新中…' : '刷新'}
          </button>
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
              cookie={cookie}
              fieldDefaults={fieldDefaults}
            />
          ))}
        </main>
      </div>
    </div>
  )
}
