import { useState } from 'react'
import { CopyButton } from '../swagger/home/CopyButton'
import { post } from '../../server'
import type { MockSessionInfo } from '../../utils/dataMockStorage'
import styles from './index.module.less'

interface MockControlPanelProps {
  method: string
  path: string
  baseUrl: string
  sourceUrl: string
  fieldRules: Record<string, unknown>
  arrayLengths: Record<string, number>
  responseSchema: Record<string, unknown>
  runningMock: MockSessionInfo | null
  onChanged: () => void
}

export function MockControlPanel({
  method,
  path,
  baseUrl,
  sourceUrl,
  fieldRules,
  arrayLengths,
  responseSchema,
  runningMock,
  onChanged,
}: MockControlPanelProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const running = !!runningMock
  const mockUrl = runningMock?.mockUrl ?? null

  const handleStart = async () => {
    setLoading(true)
    try {
      await post('/mock/start', {
        method,
        path,
        baseUrl,
        sourceUrl,
        fieldRules,
        arrayLengths,
        responseSchema,
      })
      onChanged()
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!runningMock?.mockId) return
    setLoading(true)
    try {
      await post('/mock/stop', { mockId: runningMock.mockId })
      setPreview(null)
      onChanged()
    } finally {
      setLoading(false)
    }
  }

  const handleTryRequest = async () => {
    if (!mockUrl) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch(mockUrl, {
        method: method.toUpperCase(),
        headers: { Accept: 'application/json' },
      })
      const text = await res.text()
      try {
        setPreview(JSON.stringify(JSON.parse(text), null, 2))
      } catch {
        setPreview(text)
      }
    } catch (err) {
      setPreview(err instanceof Error ? err.message : '请求失败')
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className={styles.mockControl}>
      <h3 className={styles.sectionTitle}>Mock 控制</h3>

      {!running ? (
        <button
          type="button"
          className={styles.startBtn}
          onClick={() => void handleStart()}
          disabled={loading}
        >
          {loading ? '启动中…' : '启动此接口 Mock'}
        </button>
      ) : (
        <div className={styles.runningPanel}>
          <div className={styles.mockStatus}>
            <span className={styles.statusDot} />
            此接口 Mock 运行中
          </div>

          {mockUrl && (
            <div className={styles.mockUrlRow}>
              <code className={styles.mockUrl}>{mockUrl}</code>
              <div className={styles.mockActions}>
                <CopyButton text={mockUrl} label="复制 URL" />
                <a
                  className={styles.openLink}
                  href={mockUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  新标签打开
                </a>
                <button
                  type="button"
                  className={styles.tryBtn}
                  onClick={() => void handleTryRequest()}
                  disabled={previewLoading}
                >
                  {previewLoading ? '请求中…' : '试请求'}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.stopBtn}
            onClick={() => void handleStop()}
            disabled={loading}
          >
            {loading ? '停止中…' : '停止此接口 Mock'}
          </button>
        </div>
      )}

      {preview && (
        <div className={styles.previewBlock}>
          <div className={styles.previewLabel}>响应预览</div>
          <pre className={styles.previewCode}>{preview}</pre>
        </div>
      )}
    </div>
  )
}

interface MockServicePanelProps {
  baseUrl: string
  sourceUrl: string
  mockBaseUrl: string | null
  runningCount: number
  totalMockable: number
  onStartAll: () => Promise<void>
  onStopAll: () => Promise<void>
  loading: boolean
}

export function MockServicePanel({
  baseUrl,
  mockBaseUrl,
  runningCount,
  totalMockable,
  onStartAll,
  onStopAll,
  loading,
}: MockServicePanelProps) {
  if (!baseUrl) return null

  return (
    <div className={styles.serviceMockPanel}>
      <div className={styles.serviceMockHeader}>
        <strong>服务 Mock</strong>
        <span className={styles.serviceMockMeta}>
          {runningCount}/{totalMockable} 个接口运行中
        </span>
      </div>
      <p className={styles.serviceMockHint}>
        Mock 监听 <code>{mockBaseUrl ?? `http://127.0.0.1:{port}${'...'}`}</code>
        ，端口与原始服务一致，仅 IP 为 localhost。刷新页面后状态保留。
      </p>
      <div className={styles.serviceMockActions}>
        <button
          type="button"
          className={styles.startBtn}
          disabled={loading || totalMockable === 0}
          onClick={() => void onStartAll()}
        >
          {loading ? '处理中…' : 'Mock 全部接口'}
        </button>
        <button
          type="button"
          className={styles.stopAllBtn}
          disabled={loading || runningCount === 0}
          onClick={() => void onStopAll()}
        >
          停止本服务全部 Mock
        </button>
      </div>
    </div>
  )
}

interface RunningMockListProps {
  running: MockSessionInfo[]
  onStop: (mockId: string) => void
}

export function RunningMockList({ running, onStop }: RunningMockListProps) {
  if (running.length === 0) return null

  return (
    <div className={styles.runningList}>
      <div className={styles.runningListTitle}>运行中的 Mock（{running.length}）</div>
      <ul className={styles.runningListItems}>
        {running.map((item) => (
          <li key={item.mockId} className={styles.runningListItem}>
            <div className={styles.runningListMain}>
              <span className={styles.methodBadge}>{item.method.toUpperCase()}</span>
              <code>{item.path}</code>
            </div>
            <div className={styles.runningListSub}>
              <code className={styles.runningListUrl}>{item.mockUrl}</code>
              <button
                type="button"
                className={styles.stopMiniBtn}
                onClick={() => onStop(item.mockId)}
              >
                停止
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
