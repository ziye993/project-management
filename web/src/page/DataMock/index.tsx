import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collectMockableEndpoints,
  getResponseJsonSchema,
  parseApiDocsUrl,
  resolveSchema,
} from '@/utils/openapi'
import type { ParsedEndpoint } from '@/type/openapi'
import {
  buildDefaultArrayLengths,
  buildDefaultFieldRules,
  type ArrayLengthsMap,
  type FieldRulesMap,
} from '@/utils/mockRules'
import {
  endpointRouteKey,
  findRunningMock,
  loadEndpointRules,
  saveEndpointRules,
  type MockSessionInfo,
} from '@/utils/dataMockStorage'
import type { DocTab } from '@/type/docTab'
import { post } from '@/api'
import ToolPageLayout from '@/components/ToolPageLayout'
import SwaggerDocToolbar from '@/components/SwaggerDocToolbar'
import { useSwaggerDocSession } from '@/hooks/useSwaggerDocSession'
import { EndpointPicker } from './EndpointPicker'
import { FieldRuleEditor } from './FieldRuleEditor'
import { StaticResponseEditor, staticResponseForApi } from './StaticResponseEditor'
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
  const {
    tabs,
    activeTabId,
    activeTab,
    fetchLoading,
    error,
    setError,
    fetchDocument,
    selectTab,
    closeTab,
  } = useSwaggerDocSession()
  const [phase, setPhase] = useState<PagePhase>(() => (tabs.length > 0 ? 'pick' : 'load'))
  const [mockLoading, setMockLoading] = useState(false)
  const [selected, setSelected] = useState<ParsedEndpoint | null>(null)
  const [fieldRules, setFieldRules] = useState<FieldRulesMap>({})
  const [arrayLengths, setArrayLengths] = useState<ArrayLengthsMap>({})
  const [staticResponseText, setStaticResponseText] = useState('')
  const [runningMocks, setRunningMocks] = useState<MockSessionInfo[]>([])

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
    selectTab(tab.id)
    setPhase('pick')
    setSelected(null)
    setFieldRules({})
    setArrayLengths({})
    setStaticResponseText('')
    setError(null)
  }

  const handleFetch = async (url: string, group: string) => {
    setSelected(null)
    const tab = await fetchDocument(url, group, { preferCache: true })
    if (tab) {
      activateTab(tab)
    }
  }

  const handleTabSelect = (id: string) => {
    const tab = tabs.find((t) => t.id === id)
    if (tab) activateTab(tab)
  }

  const handleCloseTab = (id: string) => {
    closeTab(id, (_nextActiveId, remainingCount) => {
      setSelected(null)
      setFieldRules({})
      setArrayLengths({})
      setStaticResponseText('')
      setPhase(remainingCount > 0 ? 'pick' : 'load')
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
    setStaticResponseText(saved?.staticResponseText ?? '')
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
      staticResponseText,
    )
  }, [selected, activeTab, fieldRules, arrayLengths, staticResponseText])

  useEffect(() => {
    persistCurrentRules()
  }, [persistCurrentRules])

  const handleStartAll = async () => {
    if (!baseUrl || !spec || !activeTab) return
    setMockLoading(true)
    try {
      const endpointRules: Record<
        string,
        { fieldRules: FieldRulesMap; arrayLengths: ArrayLengthsMap; staticResponse?: unknown }
      > = {}
      for (const ep of mockableEndpoints) {
        const saved = loadEndpointRules(activeTab.sourceUrl, ep.method, ep.path)
        const staticResponse = staticResponseForApi(saved?.staticResponseText ?? '')
        endpointRules[endpointRouteKey(ep.method, ep.path)] = {
          fieldRules: saved?.fieldRules ?? buildDefaultFieldRules(ep.responseSchema),
          arrayLengths: saved?.arrayLengths ?? buildDefaultArrayLengths(ep.responseSchema),
          staticResponse,
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

  const noJsonSchema = selected && !responseSchema

  return (
    <ToolPageLayout
      actions={
        <SwaggerDocToolbar
          tabs={tabs}
          activeTabId={activeTabId}
          fetchLoading={fetchLoading}
          onFetch={handleFetch}
          onSelectTab={handleTabSelect}
          onCloseTab={handleCloseTab}
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
            <p>点击右上角「加载文档」，加载 OpenAPI 后选择接口并配置 Mock 规则</p>
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

                  <StaticResponseEditor
                    value={staticResponseText}
                    onChange={setStaticResponseText}
                  />

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
                    staticResponseText={staticResponseText}
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
