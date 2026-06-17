import { useState } from 'react'
import { buildApiDocsUrl, fetchOpenAPISpec, parseOpenAPISpec } from '../../../utils/openapi'
import { ApiDocViewer } from './ApiDocViewer'
import { DocTabs } from './DocTabs'
import { UrlForm } from './UrlForm'
import { createDocTab, type DocTab } from '../../../type/docTab.ts'
import styles from './index.module.less'
import UserHeader from '../../../compomeents/UserHeader/index.tsx'
import PageHeader from '../../../compomeents/PageHeader/index.tsx'

function Swagger() {
  const [tabs, setTabs] = useState<DocTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [formExpanded, setFormExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addTab = (spec: DocTab['spec'], sourceUrl: string) => {
    const tab = createDocTab(spec, sourceUrl)
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
    setFormExpanded(false)
    setError(null)
  }

  const handleFetch = async (baseUrl: string, group: string) => {
    setLoading(true)
    setError(null)

    try {
      const docsUrl = buildApiDocsUrl(baseUrl, group)
      const data = await fetchOpenAPISpec(docsUrl)
      addTab(data, docsUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = (json: string) => {
    setLoading(true)
    setError(null)

    try {
      const data = parseOpenAPISpec(json)
      addTab(data, '本地粘贴的 JSON')
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
    } finally {
      setLoading(false)
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

  const showWelcome = tabs.length === 0 && !loading
  const showForm = tabs.length === 0 || formExpanded

  return (
    <div className={styles.app}>
      <UserHeader className={styles.userHeader}>
        <PageHeader>
          {showForm && <UrlForm
            onFetch={handleFetch}
            onPaste={handlePaste}
            loading={loading}
            compact={tabs.length > 0}
          />}
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
      {/* <header
        className={`${styles.appHeader} ${tabs.length > 0 ? styles.hasTabs : ''} ${!showForm ? styles.formCollapsed : ''}`}
      >
        <div className={styles.headerTop}>
          <h1 className={styles.appTitle}>API 文档查看器</h1>


        </div>

        {showWelcome && (
          <p className={styles.headerDesc}>输入服务地址，自动拉取 OpenAPI 文档并格式化展示</p>
        )}

        {showForm && (
          <UrlForm
            onFetch={handleFetch}
            onPaste={handlePaste}
            loading={loading}
            compact={tabs.length > 0}
          />
        )}
      </header> */}

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
            <ApiDocViewer spec={tab.spec} sourceUrl={tab.sourceUrl} />
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
