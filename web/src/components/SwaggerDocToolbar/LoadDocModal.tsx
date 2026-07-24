import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { API_DOC_GROUPS, type ApiDocGroup } from '../../utils/openapi'
import {
  DEFAULT_DOC_DOCUMENT_TYPE,
  DOC_DOCUMENT_TYPES,
  DOC_DOCUMENT_TYPE_LABELS,
  type DocDocumentType,
} from '@/constants/docDocumentType'
import styles from './LoadDocModal.module.less'

export type LoadDocConfirmInput =
  | { mode: 'url'; baseUrl: string; group: string; documentType: DocDocumentType }
  | { mode: 'paste'; json: string; documentType: DocDocumentType }

interface LoadDocModalProps {
  open: boolean
  loading: boolean
  onClose: () => void
  /** 成功返回 true，失败返回 false；仅成功时关闭弹窗 */
  onConfirm: (input: LoadDocConfirmInput) => boolean | Promise<boolean>
}

export default function LoadDocModal({ open, loading, onClose, onConfirm }: LoadDocModalProps) {
  const [baseUrl, setBaseUrl] = useState('http://10.1.101.54:8208/dmom-mes')
  const [group, setGroup] = useState<ApiDocGroup>('应用')
  const [documentType, setDocumentType] = useState<DocDocumentType>(DEFAULT_DOC_DOCUMENT_TYPE)
  const [pasteJson, setPasteJson] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setBaseUrl('http://10.1.101.54:8208/dmom-mes')
      setGroup('应用')
      setDocumentType(DEFAULT_DOC_DOCUMENT_TYPE)
      setPasteJson('')
      setLocalError(null)
      setSubmitting(false)
    }
  }, [open])

  const busy = loading || submitting

  const handleConfirm = async () => {
    if (busy) return

    const trimmedPaste = pasteJson.trim()
    const trimmedUrl = baseUrl.trim()

    if (!trimmedPaste && !trimmedUrl) {
      setLocalError('请填写服务地址，或粘贴接口响应 JSON')
      return
    }

    setLocalError(null)
    setSubmitting(true)
    try {
      const input: LoadDocConfirmInput = trimmedPaste
        ? { mode: 'paste', json: trimmedPaste, documentType }
        : { mode: 'url', baseUrl: trimmedUrl, group, documentType }

      const ok = await onConfirm(input)
      if (ok) {
        onClose()
      } else {
        setLocalError('加载失败，请检查地址或粘贴内容是否正确')
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title="加载文档" onClose={onClose} onOK={() => void handleConfirm()} width={560}>
      <div className={styles.form}>
        <label className={styles.field}>
          <span>文档类型</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocDocumentType)}
            disabled={busy}
          >
            {DOC_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOC_DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>服务地址</span>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://host:port/context-path"
            disabled={busy}
            onKeyDown={(e) => e.key === 'Enter' && void handleConfirm()}
          />
        </label>
        <label className={styles.field}>
          <span>API 分组</span>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as ApiDocGroup)}
            disabled={busy}
          >
            {API_DOC_GROUPS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>粘贴响应数据（可选）</span>
          <textarea
            value={pasteJson}
            onChange={(e) => setPasteJson(e.target.value)}
            placeholder="直接粘贴 /v3/api-docs 接口返回的 JSON，填写后将跳过远程请求"
            rows={8}
            disabled={busy}
            spellCheck={false}
          />
        </label>
        {localError && (
          <p className={styles.error} role="alert">
            {localError}
          </p>
        )}
        <p className={styles.hint}>
          {pasteJson.trim()
            ? '将直接解析粘贴的 OpenAPI JSON，不请求远程地址'
            : (
              <>
                将请求 <code>{'{baseUrl}/v3/api-docs/{分组}'}</code>
              </>
            )}
          {busy ? '，加载中…' : ''}
        </p>
      </div>
    </Modal>
  )
}
