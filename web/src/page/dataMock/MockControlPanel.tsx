import { useState } from 'react'
import { CopyButton } from '../swagger/home/CopyButton'
import { post } from '../../server'
import styles from './index.module.less'

interface MockControlPanelProps {
  method: string
  path: string
  baseUrl: string
  fieldRules: Record<string, unknown>
  arrayLengths: Record<string, number>
  responseSchema: Record<string, unknown>
  mockId: string | null
  mockUrl: string | null
  running: boolean
  onStarted: (data: { mockId: string; mockUrl: string }) => void
  onStopped: () => void
}

export function MockControlPanel({
  method,
  path,
  baseUrl,
  fieldRules,
  arrayLengths,
  responseSchema,
  mockId,
  mockUrl,
  running,
  onStarted,
  onStopped,
}: MockControlPanelProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    try {
      const res = await post('/mock/start', {
        method,
        path,
        baseUrl,
        fieldRules,
        arrayLengths,
        responseSchema,
      })
      onStarted({ mockId: res.data.mockId, mockUrl: res.data.mockUrl })
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!mockId) return
    setLoading(true)
    try {
      await post('/mock/stop', { mockId })
      onStopped()
      setPreview(null)
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
          {loading ? '启动中…' : '启动 Mock'}
        </button>
      ) : (
        <div className={styles.runningPanel}>
          <div className={styles.mockStatus}>
            <span className={styles.statusDot} />
            Mock 运行中
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
            {loading ? '停止中…' : '停止 Mock'}
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
