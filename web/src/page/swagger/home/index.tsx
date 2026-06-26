import { useEffect, useState } from 'react'
import {
  buildApiDocsUrl,
  fetchOpenAPISpec,
  isFetchableSourceUrl,
  parseApiDocsUrl,
  parseOpenAPISpec,
} from '../../../utils/openapi'
import {
  addSwaggerHistory,
  loadSwaggerHistory,
  loadSwaggerSession,
  saveSwaggerSession,
  type SwaggerHistoryEntry,
} from '../../../utils/swaggerStorage'
import { ApiDocViewer } from './ApiDocViewer'
import { DocTabs } from './DocTabs'
import { UrlForm } from './UrlForm'
import { createDocTab, createTabLabel, type DocTab } from '../../../type/docTab.ts'
import styles from './index.module.less'
import UserHeader from '../../../compomeents/UserHeader/index.tsx'
import PageHeader from '../../../compomeents/PageHeader/index.tsx'

function Swagger() {
  const [initialSession] = useState(() => loadSwaggerSession())
  const [tabs, setTabs] = useState<DocTab[]>(initialSession?.tabs ?? [])
  const [activeTabId, setActiveTabId] = useState<string | null>(initialSession?.activeTabId ?? null)
  const [formExpanded, setFormExpanded] = useState(() => (initialSession?.tabs.length ?? 0) === 0)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [refreshingTabId, setRefreshingTabId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SwaggerHistoryEntry[]>(() => loadSwaggerHistory())

  useEffect(() => {
    saveSwaggerSession(tabs, activeTabId)
  }, [tabs, activeTabId])

  const addTab = (
    spec: DocTab['spec'],
    sourceUrl: string,
    meta?: { baseUrl: string; group: string },
  ) => {
    const tab = createDocTab(spec, sourceUrl)
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
    setFormExpanded(false)
    setError(null)

    if (meta) {
      setHistory(addSwaggerHistory(spec, sourceUrl, meta.baseUrl, meta.group))
    }
  }

  const handleFetch = async (baseUrl: string, group: string) => {
    setFetchLoading(true)
    setError(null)

    try {
      const docsUrl = buildApiDocsUrl(baseUrl, group)
      const data = await fetchOpenAPISpec(docsUrl)
      addTab(data, docsUrl, { baseUrl, group })
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setFetchLoading(false)
    }
  }

  const handlePaste = (json: string) => {
    setFetchLoading(true)
    setError(null)

    try {
      const data = parseOpenAPISpec(json)
      addTab(data, '本地粘贴的 JSON')
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleHistorySelect = (entry: SwaggerHistoryEntry) => {
    const cached = tabs.find((t) => t.sourceUrl === entry.sourceUrl)
    if (cached) {
      setActiveTabId(cached.id)
      setFormExpanded(false)
      setError(null)
      return
    }
    void handleFetch(entry.baseUrl, entry.group)
  }

  const handleRefreshTab = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab || !isFetchableSourceUrl(tab.sourceUrl)) return

    setRefreshingTabId(tabId)
    setError(null)

    try {
      const data = await fetchOpenAPISpec(tab.sourceUrl)
      const label = createTabLabel(data, tab.sourceUrl)
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, spec: data, label } : t)),
      )

      const parsed = parseApiDocsUrl(tab.sourceUrl)
      if (parsed) {
        setHistory(addSwaggerHistory(data, tab.sourceUrl, parsed.baseUrl, parsed.group))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新失败')
    } finally {
      setRefreshingTabId(null)
    }
  }

  const handleCloseTab = (id: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)

      if (id === activeTabId) {
        const newActive = next[index] ?? next[index - 1] ?? null
        setActiveTabId(newActive?.id ?? null)
      }

      if (next.length === 0) {
        setFormExpanded(true)
      }

      return next
    })
  }

  const showWelcome = tabs.length === 0 && !fetchLoading
  const showForm = tabs.length === 0 || formExpanded

  return (
    <div className={styles.app}>
      <UserHeader className={styles.userHeader}>
        <PageHeader>
          {showForm && (
            <UrlForm
              onFetch={handleFetch}
              onPaste={handlePaste}
              loading={fetchLoading}
              compact={tabs.length > 0}
              history={history}
              onHistorySelect={handleHistorySelect}
            />
          )}
          {tabs.length > 0 && (
            <DocTabs
              tabs={tabs}
              activeTabId={activeTabId!}
              onSelect={setActiveTabId}
              onClose={handleCloseTab}
              onAdd={() => setFormExpanded(true)}
            />
          )}

          {tabs.length > 0 && (
            <button
              type="button"
              className={styles.formToggleBtn}
              onClick={() => setFormExpanded(!formExpanded)}
            >
              {showForm ? '收起' : '加载文档'}
            </button>
          )}
        </PageHeader>
      </UserHeader>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <strong>加载失败：</strong>{error}
        </div>
      )}

      <div className={styles.docPanel}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={styles.docPanelItem}
            hidden={tab.id !== activeTabId}
          >
            <ApiDocViewer
              spec={tab.spec}
              sourceUrl={tab.sourceUrl}
              canRefresh={isFetchableSourceUrl(tab.sourceUrl)}
              refreshing={refreshingTabId === tab.id}
              onRefresh={() => void handleRefreshTab(tab.id)}
            />
          </div>
        ))}

        {showWelcome && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📄</div>
            <p>输入服务地址后点击「加载文档」开始</p>
            <p className={styles.emptyHint}>
              将自动请求 <code>{'{baseUrl}/v3/api-docs/{分组}'}</code> 接口
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Swagger
