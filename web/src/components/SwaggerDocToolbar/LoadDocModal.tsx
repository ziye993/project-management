import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { API_DOC_GROUPS, type ApiDocGroup } from '../../utils/openapi'
import styles from './LoadDocModal.module.less'

interface LoadDocModalProps {
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (baseUrl: string, group: string) => void | Promise<void>
}

export default function LoadDocModal({ open, loading, onClose, onConfirm }: LoadDocModalProps) {
  const [baseUrl, setBaseUrl] = useState('http://10.1.101.54:8208/dmom-mes')
  const [group, setGroup] = useState<ApiDocGroup>('应用')

  useEffect(() => {
    if (open) {
      setBaseUrl('http://10.1.101.54:8208/dmom-mes')
      setGroup('应用')
    }
  }, [open])

  const handleConfirm = () => {
    const trimmed = baseUrl.trim()
    if (!trimmed || loading) return
    onClose()
    void onConfirm(trimmed, group)
  }

  return (
    <Modal open={open} title="加载文档" onClose={onClose} onOK={handleConfirm} width={480}>
      <div className={styles.form}>
        <label className={styles.field}>
          <span>服务地址</span>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://host:port/context-path"
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </label>
        <label className={styles.field}>
          <span>API 分组</span>
          <select value={group} onChange={(e) => setGroup(e.target.value as ApiDocGroup)}>
            {API_DOC_GROUPS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.hint}>
          将请求 <code>{'{baseUrl}/v3/api-docs/{分组}'}</code>
          {loading ? '，加载中…' : ''}
        </p>
      </div>
    </Modal>
  )
}
