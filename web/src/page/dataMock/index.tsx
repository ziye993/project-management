import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildApiDocsUrl,
  collectMockableEndpoints,
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
import {
  endpointRouteKey,
  findRunningMock,
  loadEndpointRules,
  saveEndpointRules,
  type MockSessionInfo,
} from '../../utils/dataMockStorage'
import { createDocTab, type DocTab } from '../../type/docTab'
import { post } from '../../server'
import ToolPageLayout from '../../compomeents/ToolPageLayout'
import SwaggerDocToolbar from '../../compomeents/SwaggerDocToolbar'
import { EndpointPicker } from './EndpointPicker'
import { FieldRuleEditor } from './FieldRuleEditor'
import { MockControlPanel, MockServicePanel, RunningMockList } from './MockControlPanel'
import styles from './index.module.less'

type PagePhase = 'load' | 'pick' | 'configure'

function getBaseUrlFromTab(tab: DocTab): string {
  const parsed = parseApiDocsUrl(tab.sourceUrl)
  return parsed?.baseUrl ?? ''
}

function buildMockBaseUrlClient(baseUrl: string): string {
  try {
    const u = new URL(baseUrl)
    const port = u.port || (u.protocol === 'https:' ? '443' : '80')
    const cp = u.pathname.replace(/\/+$/, '')
    return `http://127.0.0.1:${port}${cp}`
  } catch {
    return ''
  }
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
  const [mockLoading, setMockLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ParsedEndpoint | null>(null)
  const [fieldRules, setFieldRules] = useState<FieldRulesMap>({})
  const [arrayLengths, setArrayLengths] = useState<ArrayLengthsMap>({})
  const [runningMocks, setRunningMocks] = useState<MockSessionInfo[]>([])

  const activeTab = useMemo(() => {
    if (!tabs.length) return null
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  }, [tabs, activeTabId])

  const spec = activeTab?.spec ?? null
  const baseUrl = activeTab ? getBaseUrlFromTab(activeTab) : ''
  const sourceUrl = activeTab?.sourceUrl ?? ''

  const mockableEndpoints = useMemo(
    () => (spec ? collectMockableEndpoints(spec) : []),
    [spec],
  )

  const serviceRunningMocks = useMemo(
    () => runningMocks.filter((m) => m.baseUrl === baseUrl || m.sourceUrl === sourceUrl),
    [runningMocks, baseUrl, sourceUrl],
  )

  const runningKeys = useMemo(
    () => new Set(serviceRunningMocks.map((m) => endpointRouteKey(m.method, m.path))),
    [serviceRunningMocks],
  )

  const mockBaseUrl = useMemo(() => {
    if (serviceRunningMocks[0]?.mockBaseUrl) return serviceRunningMocks[0].mockBaseUrl
    return baseUrl ? buildMockBaseUrlClient(baseUrl) : null
  }, [serviceRunningMocks, baseUrl])

  const currentRunningMock = useMemo(() => {
    if (!selected) return null
    return findRunningMock(serviceRunningMocks, selected.method, selected.path, baseUrl) ?? null
  }, [serviceRunningMocks, selected, baseUrl])

  const refreshMockStatus = useCallback(async () => {
    try {
      const res = await post('/mock/status')
      setRunningMocks(res.data?.running ?? [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    saveSwaggerSession(tabs, activeTabId)
  }, [tabs, activeTabId])

  useEffect(() => {
    void refreshMockStatus()
  }, [refreshMockStatus])

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
    url: string,
    meta?: { baseUrl: string; group: string },
  ) => {
    const tab = createDocTab(data, url)
    setTabs((prev) => [...prev, tab])
    activateTab(tab)

    if (meta) {
      setHistory(addSwaggerHistory(data, url, meta.baseUrl, meta.group))
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

    if (!spec || !activeTab) {
      setPhase('pick')
      return
    }

    const rawSchema = getResponseJsonSchema(spec, endpoint.operation)
    if (!rawSchema) {
      setPhase('pick')
      return
    }

    const resolved = resolveSchema(spec, rawSchema)
    const saved = loadEndpointRules(activeTab.sourceUrl, endpoint.method, endpoint.path)
    setFieldRules(saved?.fieldRules ?? buildDefaultFieldRules(resolved))
    setArrayLengths(saved?.arrayLengths ?? buildDefaultArrayLengths(resolved))
    setPhase('configure')
  }

  const persistCurrentRules = useCallback(() => {
    if (!selected || !activeTab) return
    saveEndpointRules(
      activeTab.sourceUrl,
      selected.method,
      selected.path,
      fieldRules,
      arrayLengths,
    )
  }, [selected, activeTab, fieldRules, arrayLengths])

  useEffect(() => {
    persistCurrentRules()
  }, [persistCurrentRules])

  const handleStartAll = async () => {
    if (!baseUrl || !spec || !activeTab) return
    setMockLoading(true)
    try {
      const endpointRules: Record<string, { fieldRules: FieldRulesMap; arrayLengths: ArrayLengthsMap }> = {}
      for (const ep of mockableEndpoints) {
        const saved = loadEndpointRules(activeTab.sourceUrl, ep.method, ep.path)
        endpointRules[endpointRouteKey(ep.method, ep.path)] = {
          fieldRules: saved?.fieldRules ?? buildDefaultFieldRules(ep.responseSchema),
          arrayLengths: saved?.arrayLengths ?? buildDefaultArrayLengths(ep.responseSchema),
        }
      }
      await post('/mock/startAll', {
        baseUrl,
        sourceUrl: activeTab.sourceUrl,
        spec,
        endpointRules,
      })
      await refreshMockStatus()
    } finally {
      setMockLoading(false)
    }
  }

  const handleStopAll = async () => {
    if (!activeTab) return
    setMockLoading(true)
    try {
      await post('/mock/stopAll', { baseUrl, sourceUrl: activeTab.sourceUrl })
      await refreshMockStatus()
    } finally {
      setMockLoading(false)
    }
  }

  const handleStopOne = async (mockId: string) => {
    await post('/mock/stop', { mockId })
    await refreshMockStatus()
  }

  const showForm = tabs.length === 0 || formExpanded
  const noJsonSchema = selected && !responseSchema

  return (
    <ToolPageLayout
      actions={
        <SwaggerDocToolbar
          showForm={showForm}
          tabs={tabs}
          activeTabId={activeTabId}
          fetchLoading={fetchLoading}
          history={history}
          onFetch={handleFetch}
          onPaste={handlePaste}
          onHistorySelect={handleHistorySelect}
          onSelectTab={handleTabSelect}
          onCloseTab={handleCloseTab}
          onAddTab={() => setFormExpanded(true)}
          onToggleForm={() => setFormExpanded(!formExpanded)}
        />
      }
    >
      <div className={styles.pageBody}>
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
              与 Swagger 共用文档缓存；Mock 在 localhost 原端口监听，支持多接口并行
            </p>
          </div>
        )}

        {spec && (phase === 'pick' || phase === 'configure') && (
          <div className={styles.workspace}>
            <aside className={styles.pickerColumn}>
              <EndpointPicker
                spec={spec}
                selected={selected}
                runningKeys={runningKeys}
                onSelect={handleSelectEndpoint}
              />
            </aside>

            <section className={styles.configColumn}>
              <MockServicePanel
                baseUrl={baseUrl}
                sourceUrl={sourceUrl}
                mockBaseUrl={mockBaseUrl}
                runningCount={serviceRunningMocks.length}
                totalMockable={mockableEndpoints.length}
                onStartAll={handleStartAll}
                onStopAll={handleStopAll}
                loading={mockLoading}
              />

              <RunningMockList running={serviceRunningMocks} onStop={(id) => void handleStopOne(id)} />

              {!selected && (
                <div className={styles.placeholder}>
                  请从左侧选择一个接口，或点击「Mock 全部接口」
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
                    {currentRunningMock && <span className={styles.mockingBadge}>Mock 中</span>}
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
                    sourceUrl={sourceUrl}
                    fieldRules={fieldRules}
                    arrayLengths={arrayLengths}
                    responseSchema={responseSchema as Record<string, unknown>}
                    runningMock={currentRunningMock}
                    onChanged={() => void refreshMockStatus()}
                  />
                </>
              )}
            </section>
          </div>
        )}
      </div>
      </div>
    </ToolPageLayout>
  )
}

export default DataMock
