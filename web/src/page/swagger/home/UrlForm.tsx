import { useState, type FormEvent } from 'react'
import styles from './index.module.less'

// type LoadMode = 'fetch' | 'paste'

interface UrlFormProps {
  onFetch: (baseUrl: string, group: string) => void
  onPaste: (json: string) => void
  loading: boolean
  compact?: boolean
}

export function UrlForm({ onFetch, loading, compact = false }: UrlFormProps) {
  // const [mode, setMode] = useState<LoadMode>('fetch')
  const [baseUrl, setBaseUrl] = useState('http://10.1.101.54:8208/dmom-mes')
  const [group, setGroup] = useState('应用')
  // const [jsonText, setJsonText] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // if (mode === 'fetch') {
      if (!baseUrl.trim()) return
      onFetch(baseUrl.trim(), group.trim() || '应用')
    // } else {
    //   if (!jsonText.trim()) return
    //   onPaste(jsonText.trim())
    // }
  }

  return (
    <div className={`${styles.urlFormWrapper} ${compact ? styles.compact : ''}`}>
      {/* <div className={styles.modeTabs}>
        <button
          type="button"
          className={`${styles.modeTab} ${mode === 'fetch' ? styles.active : ''}`}
          onClick={() => setMode('fetch')}
        >
          从服务加载
        </button>
        <button
          type="button"
          className={`${styles.modeTab} ${mode === 'paste' ? styles.active : ''}`}
          onClick={() => setMode('paste')}
        >
          粘贴 JSON
        </button>
      </div> */}

      <form className={styles.urlForm} onSubmit={handleSubmit}>
        {/* {mode === 'fetch' ? ( */}
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
            {/* {!compact && (
              <p className={styles.formHint}>
                请求 <code>{'{baseUrl}/v3/api-docs/{分组}'}</code>
              </p>
            )} */}
          </>
        {/* ) : (
          <div className={`${styles.formRow} ${styles.formRowFull}`}>
            <label htmlFor="json-paste">OpenAPI JSON</label>
            <textarea
              id="json-paste"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="粘贴 /v3/api-docs 接口返回的 JSON…"
              rows={5}
              required
            />
          </div>
        )} */}

        <button type="submit" className={styles.loadBtn} disabled={loading}>
          {loading ? '加载中…' : '加载文档'}
        </button>
      </form>
    </div>
  )
}
