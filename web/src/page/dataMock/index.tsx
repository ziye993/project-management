import { useEffect, useMemo, useState } from 'react'
import {
  buildApiDocsUrl,
  fetchOpenAPISpec,
  getResponseJsonSchema,
  parseApiDocsUrl,
  parseOpenAPISpec,
  resolveSchema,
} from '../../utils/openapi'
import type { OpenAPISpec, ParsedEndpoint } from '../../type/openapi'
import {
  buildDefaultArrayLengths,
  buildDefaultFieldRules,
  type ArrayLengthsMap,
  type FieldRulesMap,
} from '../../utils/mockRules'
import {
  addSwaggerHistory,
  loadSwaggerHistory,
  loadSwaggerSession,
  saveSwaggerSession,
  type SwaggerHistoryEntry,
} from '../../utils/swaggerStorage'
import { createDocTab, type DocTab } from '../../type/docTab'
import { post } from '../../server'
import { UrlForm } from '../swagger/home/UrlForm'
import { DocTabs } from '../swagger/home/DocTabs'
import UserHeader from '../../compomeents/UserHeader/index.tsx'
import PageHeader from '../../compomeents/PageHeader/index.tsx'
import { EndpointPicker } from './EndpointPicker'
import { FieldRuleEditor } from './FieldRuleEditor'
import { MockControlPanel } from './MockControlPanel'
import styles from './index.module.less'

type PagePhase = 'load' | 'pick' | 'configure'

function getBaseUrlFromTab(tab: DocTab): string {
  const parsed = parseApiDocsUrl(tab.sourceUrl)
  return parsed?.baseUrl ?? ''
}

function DataMock() {
  const [initialSession] = useState(() => loadSwaggerSession())
  const [tabs, setTabs] = useState<DocTab[]>(initialSession?.tabs ?? [])
  const [activeTabId, setActiveTabId] = useState<string | null>(initialSession?.activeTabId ?? null)
  const [phase, setPhase] = useState<PagePhase>(() =>
    (initialSession?.tabs.length ?? 0) > 0 ? 'pick' : 'load',
  )
  const [formExpanded, setFormExpanded] = useState(() => (initialSession?.tabs.length ?? 0) === 0)
  const [history, setHistory] = useState<SwaggerHistoryEntry[]>(() => loadSwaggerHistory())
  const [fetchLoading, setFetchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ParsedEndpoint | null>(null)
  const [fieldRules, setFieldRules] = useState<FieldRulesMap>({})
  const [arrayLengths, setArrayLengths] = useState<ArrayLengthsMap>({})
  const [mockId, setMockId] = useState<string | null>(null)
  const [mockUrl, setMockUrl] = useState<string | null>(null)

  const activeTab = useMemo(() => {
    if (!tabs.length) return null
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  }, [tabs, activeTabId])

  const spec = activeTab?.spec ?? null
  const baseUrl = activeTab ? getBaseUrlFromTab(activeTab) : ''

  useEffect(() => {
    saveSwaggerSession(tabs, activeTabId)
  }, [tabs, activeTabId])

  useEffect(() => {
    void post('/mock/status').then((res) => {
      const running = res.data?.running?.[0]
      if (running) {
        setMockId(running.mockId)
        setMockUrl(
          typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.host}${running.mockPath.replace(/\{[^}]+\}/g, '1')}`
            : null,
        )
      }
    }).catch(() => {})
  }, [])

  const responseSchemaRaw = useMemo(() => {
    if (!spec || !selected) return null
    return getResponseJsonSchema(spec, selected.operation)
  }, [spec, selected])

  const responseSchema = useMemo(() => {
    if (!spec || !responseSchemaRaw) return null
    return resolveSchema(spec, responseSchemaRaw)
  }, [spec, responseSchemaRaw])

  const activateTab = (tab: DocTab) => {
    setActiveTabId(tab.id)
    setPhase('pick')
    setFormExpanded(false)
    setSelected(null)
    setFieldRules({})
    setArrayLengths({})
    setError(null)
  }

  const addTab = (
    data: OpenAPISpec,
    sourceUrl: string,
    meta?: { baseUrl: string; group: string },
  ) => {
    const tab = createDocTab(data, sourceUrl)
    setTabs((prev) => [...prev, tab])
    activateTab(tab)

    if (meta) {
      setHistory(addSwaggerHistory(data, sourceUrl, meta.baseUrl, meta.group))
    }
  }

  const useCachedTab = (tab: DocTab) => {
    activateTab(tab)
  }

  const handleFetch = async (url: string, group: string) => {
    const docsUrl = buildApiDocsUrl(url, group)
    const cached = tabs.find((t) => t.sourceUrl === docsUrl)
    if (cached) {
      useCachedTab(cached)
      return
    }

    setFetchLoading(true)
    setError(null)
    setSelected(null)
    setMockId(null)
    setMockUrl(null)

    try {
      const data = await fetchOpenAPISpec(docsUrl)
      addTab(data, docsUrl, { baseUrl: url, group })
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
      useCachedTab(cached)
      return
    }
    void handleFetch(entry.baseUrl, entry.group)
  }

  const handleTabSelect = (id: string) => {
    const tab = tabs.find((t) => t.id === id)
    if (tab) useCachedTab(tab)
  }

  const handleCloseTab = (id: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)

      if (id === activeTabId) {
        const newActive = next[index] ?? next[index - 1] ?? null
        setActiveTabId(newActive?.id ?? null)
        if (newActive) {
          setPhase('pick')
        } else {
          setPhase('load')
          setFormExpanded(true)
        }
        setSelected(null)
        setFieldRules({})
        setArrayLengths({})
      }

      if (next.length === 0) {
        setFormExpanded(true)
        setPhase('load')
      }

      return next
    })
  }

  const handleSelectEndpoint = (endpoint: ParsedEndpoint) => {
    setSelected(endpoint)
    setMockId(null)
    setMockUrl(null)

    if (!spec) {
      setPhase('pick')
      return
    }

    const rawSchema = getResponseJsonSchema(spec, endpoint.operation)
    if (!rawSchema) {
      setPhase('pick')
      return
    }

    const resolved = resolveSchema(spec, rawSchema)
    setFieldRules(buildDefaultFieldRules(resolved))
    setArrayLengths(buildDefaultArrayLengths(resolved))
    setPhase('configure')
  }

  const handleMockStarted = ({ mockId: id, mockUrl: url }: { mockId: string; mockUrl: string }) => {
    setMockId(id)
    setMockUrl(url)
  }

  const handleMockStopped = () => {
    setMockId(null)
    setMockUrl(null)
  }

  const showForm = tabs.length === 0 || formExpanded
  const noJsonSchema = selected && !responseSchema

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
          {tabs.length > 0 && activeTabId && (
            <DocTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={handleTabSelect}
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
          <strong>错误：</strong>{error}
        </div>
      )}

      <div className={styles.mainPanel}>
        {phase === 'load' && !fetchLoading && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎭</div>
            <p>输入服务地址后加载 OpenAPI，选择接口并配置 Mock 规则</p>
            <p className={styles.emptyHint}>
              与 Swagger 共用文档缓存，已在 Swagger 加载过的文档可直接使用
            </p>
          </div>
        )}

        {spec && (phase === 'pick' || phase === 'configure') && (
          <div className={styles.workspace}>
            <aside className={styles.pickerColumn}>
              <EndpointPicker
                spec={spec}
                selected={selected}
                onSelect={handleSelectEndpoint}
              />
            </aside>

            <section className={styles.configColumn}>
              {!selected && (
                <div className={styles.placeholder}>
                  请从左侧选择一个接口
                </div>
              )}

              {noJsonSchema && (
                <div className={styles.warningBanner}>
                  该接口没有 200 响应的 application/json schema，无法 Mock
                </div>
              )}

              {selected && responseSchema && (
                <>
                  <div className={styles.selectedEndpoint}>
                    <span className={styles.methodBadge}>{selected.method.toUpperCase()}</span>
                    <code>{selected.path}</code>
                  </div>

                  <FieldRuleEditor
                    spec={spec}
                    schema={responseSchema}
                    fieldRules={fieldRules}
                    arrayLengths={arrayLengths}
                    onFieldRulesChange={setFieldRules}
                    onArrayLengthsChange={setArrayLengths}
                  />

                  <MockControlPanel
                    method={selected.method}
                    path={selected.path}
                    baseUrl={baseUrl}
                    fieldRules={fieldRules}
                    arrayLengths={arrayLengths}
                    responseSchema={responseSchema as Record<string, unknown>}
                    mockId={mockId}
                    mockUrl={mockUrl}
                    running={!!mockId}
                    onStarted={handleMockStarted}
                    onStopped={handleMockStopped}
                  />
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default DataMock
