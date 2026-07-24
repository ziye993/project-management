import { useEffect, useMemo, useRef, useState } from 'react'
import type { DocTab } from '../../type/docTab'
import { DocTabs } from '@/page/Swagger/Home/DocTabs'
import {
  buildSwaggerExport,
  downloadSwaggerExport,
} from '@/utils/swaggerStorage'
import {
  analyzeSwaggerMerge,
  resolveSwaggerMerge,
  type ConflictChoice,
  type SwaggerMergePlan,
} from '@/utils/swaggerDiff'
import { getSwaggerConfig, setSwaggerConfig } from '@/api/swagger'
import {
  DEFAULT_DOC_DOCUMENT_TYPE,
  DOC_DOCUMENT_TYPES,
  DOC_DOCUMENT_TYPE_LABELS,
  normalizeDocDocumentType,
  type DocDocumentType,
} from '@/constants/docDocumentType'
import message from '@/components/ui/Modal/message'
import LoadDocModal, { type LoadDocConfirmInput } from './LoadDocModal'
import ConflictMergeModal from './ConflictMergeModal'
import styles from './index.module.less'

interface SwaggerDocToolbarProps {
  tabs: DocTab[]
  activeTabId: string | null
  fetchLoading: boolean
  onFetch: (input: LoadDocConfirmInput) => boolean | Promise<boolean>
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onImport?: (raw: string) => void
  onApplySyncedTabs?: (tabs: DocTab[], activeTabId: string | null) => void
}

export default function SwaggerDocToolbar(props: SwaggerDocToolbarProps) {
  const {
    tabs,
    activeTabId,
    fetchLoading,
    onSelectTab,
    onCloseTab,
    onImport,
    onFetch,
    onApplySyncedTabs,
  } = props
  const [modalOpen, setModalOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<DocDocumentType | ''>(DEFAULT_DOC_DOCUMENT_TYPE)
  const [syncLoading, setSyncLoading] = useState(false)
  const [mergePlan, setMergePlan] = useState<SwaggerMergePlan | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredTabs = useMemo(() => {
    if (!typeFilter) return tabs
    return tabs.filter((tab) => normalizeDocDocumentType(tab.documentType) === typeFilter)
  }, [tabs, typeFilter])

  useEffect(() => {
    if (!filteredTabs.length) return
    if (activeTabId && filteredTabs.some((tab) => tab.id === activeTabId)) return
    onSelectTab(filteredTabs[0].id)
  }, [filteredTabs, activeTabId, onSelectTab])

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
    if (!file || !onImport) return
    try {
      const raw = await file.text()
      onImport(raw)
      setImportError(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveToServer = async () => {
    if (!tabs.length) {
      message.info('当前没有可保存的文档')
      return
    }
    setSyncLoading(true)
    setImportError(null)
    try {
      const res = await setSwaggerConfig({ tabs, activeTabId })
      if (!res?.success && res?.code !== 0) {
        throw new Error(res?.msg || '保存失败')
      }
      message.success('已保存到服务端')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败'
      setImportError(msg)
      message.error(msg)
    } finally {
      setSyncLoading(false)
    }
  }

  const handleMergeFromServer = async () => {
    setSyncLoading(true)
    setImportError(null)
    try {
      const res = await getSwaggerConfig()
      const remoteTabs = (res?.data?.tabs ?? []) as DocTab[]
      const plan = analyzeSwaggerMerge(tabs, remoteTabs)

      if (!plan.conflicts.length && !plan.remoteOnly.length) {
        if (!remoteTabs.length) {
          message.info('服务端暂无配置')
        } else {
          message.success('本地已与服务端一致，无需合并')
        }
        return
      }

      if (!plan.conflicts.length) {
        const merged = resolveSwaggerMerge(plan, {})
        const nextActive =
          (activeTabId && merged.some((t) => t.id === activeTabId) && activeTabId) ||
          merged[0]?.id ||
          null
        onApplySyncedTabs?.(merged, nextActive)
        await setSwaggerConfig({ tabs: merged, activeTabId: nextActive })
        message.success(
          plan.remoteOnly.length
            ? `已合并，新增 ${plan.remoteOnly.length} 个服务端文档`
            : '合并完成',
        )
        return
      }

      setMergePlan(plan)
      setMergeOpen(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '拉取服务端配置失败'
      setImportError(msg)
      message.error(msg)
    } finally {
      setSyncLoading(false)
    }
  }

  const handleResolveConflicts = async (choices: Record<string, ConflictChoice>) => {
    if (!mergePlan) return
    setSyncLoading(true)
    try {
      const merged = resolveSwaggerMerge(mergePlan, choices)
      const nextActive =
        (activeTabId && merged.some((t) => t.id === activeTabId) && activeTabId) ||
        merged[0]?.id ||
        null
      onApplySyncedTabs?.(merged, nextActive)
      await setSwaggerConfig({ tabs: merged, activeTabId: nextActive })
      setMergeOpen(false)
      setMergePlan(null)
      message.success('同步完成：本地与服务端已按选择更新')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '同步失败'
      message.error(msg)
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <>
      {filteredTabs.length > 0 && activeTabId && (
        <DocTabs
          tabs={filteredTabs}
          activeTabId={activeTabId}
          onSelect={onSelectTab}
          onClose={onCloseTab}
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
          disabled={!onImport}
        >
          导入配置
        </button>
        <button
          type="button"
          className={styles.formToggleBtn}
          onClick={() => void handleSaveToServer()}
          disabled={syncLoading || !tabs.length}
          title="将当前本地配置覆盖保存到服务端"
        >
          保存到服务端
        </button>
        <button
          type="button"
          className={styles.formToggleBtn}
          onClick={() => void handleMergeFromServer()}
          disabled={syncLoading || !onApplySyncedTabs}
          title="从服务端拉取并合并；冲突时手动选择保留项"
        >
          从服务端合并
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void handleImportFile(e.target.files?.[0])}
        />
      </div>
      <div className={styles.typeFilter}>
        <label className={styles.typeFilterLabel}>
          <span className={styles.typeFilterText}>类型</span>
          <select
            className={styles.typeFilterSelect}
            value={typeFilter}
            onChange={(e) => {
              const value = e.target.value
              setTypeFilter(value ? (value as DocDocumentType) : '')
            }}
            title="按文档类型筛选；清空表示展示全部"
          >
            <option value="">全部</option>
            {DOC_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOC_DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {typeFilter ? (
            <button
              type="button"
              className={styles.typeFilterClear}
              onClick={() => setTypeFilter('')}
              title="清除筛选，展示全部文档"
            >
              ×
            </button>
          ) : null}
        </label>
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
        onConfirm={onFetch}
      />
      <ConflictMergeModal
        open={mergeOpen}
        plan={mergePlan}
        submitting={syncLoading}
        onClose={() => {
          if (syncLoading) return
          setMergeOpen(false)
          setMergePlan(null)
        }}
        onConfirm={handleResolveConflicts}
      />
    </>
  )
}
