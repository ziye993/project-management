import { useRef, useState } from 'react'
import type { DocTab } from '../../type/docTab'
import { DocTabs } from '@/page/Swagger/Home/DocTabs'
import {
  buildSwaggerExport,
  downloadSwaggerExport,
} from '@/utils/swaggerStorage'
import LoadDocModal, { type LoadDocConfirmInput } from './LoadDocModal'
import styles from './index.module.less'

interface SwaggerDocToolbarProps {
  tabs: DocTab[]
  activeTabId: string | null
  fetchLoading: boolean
  onFetch: (input: LoadDocConfirmInput) => boolean | Promise<boolean>
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onImport?: (raw: string) => void
}

export default function SwaggerDocToolbar(props: SwaggerDocToolbarProps) {
  const { tabs, activeTabId, fetchLoading } = props
  const [modalOpen, setModalOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    if (!tabs.length) {
      setImportError('当前没有可导出的文档')
      return
    }
    setImportError(null)
    downloadSwaggerExport(buildSwaggerExport(tabs, activeTabId))
  }

  const handleImportClick = () => {
    setImportError(null)
    fileInputRef.current?.click()
  }

  const handleImportFile = async (file: File | undefined) => {
    if (!file || !props.onImport) return
    try {
      const raw = await file.text()
      props.onImport(raw)
      setImportError(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {tabs.length > 0 && activeTabId && (
        <DocTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={props.onSelectTab}
          onClose={props.onCloseTab}
          onAdd={() => setModalOpen(true)}
        />
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.formToggleBtn}
          onClick={() => setModalOpen(true)}
        >
          加载文档
        </button>
        <button
          type="button"
          className={styles.formToggleBtn}
          onClick={handleExport}
          disabled={!tabs.length}
          title={tabs.length ? '导出当前全部文档配置（含完整 spec、备注等）' : '暂无文档可导出'}
        >
          导出配置
        </button>
        <button
          type="button"
          className={styles.formToggleBtn}
          onClick={handleImportClick}
          disabled={!props.onImport}
        >
          导入配置
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void handleImportFile(e.target.files?.[0])}
        />
      </div>
      {importError && (
        <span className={styles.importError} role="alert">
          {importError}
        </span>
      )}
      <LoadDocModal
        open={modalOpen}
        loading={fetchLoading}
        onClose={() => setModalOpen(false)}
        onConfirm={props.onFetch}
      />
    </>
  )
}
