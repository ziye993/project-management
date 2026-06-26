import { useState, type FormEvent } from 'react'
import type { SwaggerHistoryEntry } from '../../../utils/swaggerStorage'
import styles from './index.module.less'

interface UrlFormProps {
  onFetch: (baseUrl: string, group: string) => void
  onPaste: (json: string) => void
  loading: boolean
  compact?: boolean
  history?: SwaggerHistoryEntry[]
  onHistorySelect?: (entry: SwaggerHistoryEntry) => void
}

export function UrlForm({
  onFetch,
  loading,
  compact = false,
  history = [],
  onHistorySelect,
}: UrlFormProps) {
  const [baseUrl, setBaseUrl] = useState('http://10.1.101.54:8208/dmom-mes')
  const [group, setGroup] = useState('应用')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!baseUrl.trim()) return
    onFetch(baseUrl.trim(), group.trim() || '应用')
  }

  const handleHistoryClick = (entry: SwaggerHistoryEntry) => {
    setBaseUrl(entry.baseUrl)
    setGroup(entry.group)
    onHistorySelect?.(entry)
  }

  return (
    <div className={`${styles.urlFormWrapper} ${compact ? styles.compact : ''}`}>
      <form className={styles.urlForm} onSubmit={handleSubmit}>
        <>
          <div className={styles.formRow}>
            <label htmlFor="base-url">服务地址</label>
            <input
              id="base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://host:port/context-path"
              required
            />
          </div>
          <div className={`${styles.formRow} ${styles.formRowSm}`}>
            <label htmlFor="api-group">API 分组</label>
            <input
              id="api-group"
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="应用"
            />
          </div>
        </>

        <button type="submit" className={styles.loadBtn} disabled={loading}>
          {loading ? '加载中…' : '加载文档'}
        </button>
      </form>

      {history.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.historyLabel}>最近加载</div>
          <div className={styles.historyList}>
            {history.map((entry) => (
              <button
                key={entry.sourceUrl}
                type="button"
                className={styles.historyItem}
                onClick={() => handleHistoryClick(entry)}
                title={entry.sourceUrl}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
