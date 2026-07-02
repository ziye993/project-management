import { useState } from 'react'
import type { DocTab } from '../../type/docTab'
import { DocTabs } from '@/page/Swagger/Home/DocTabs'
import LoadDocModal from './LoadDocModal'
import styles from './index.module.less'

interface SwaggerDocToolbarProps {
  tabs: DocTab[]
  activeTabId: string | null
  fetchLoading: boolean
  onFetch: (baseUrl: string, group: string) => void | Promise<void>
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
}

export default function SwaggerDocToolbar(props: SwaggerDocToolbarProps) {
  const { tabs, activeTabId, fetchLoading } = props
  const [modalOpen, setModalOpen] = useState(false)

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
      <button
        type="button"
        className={styles.formToggleBtn}
        onClick={() => setModalOpen(true)}
      >
        加载文档
      </button>
      <LoadDocModal
        open={modalOpen}
        loading={fetchLoading}
        onClose={() => setModalOpen(false)}
        onConfirm={props.onFetch}
      />
    </>
  )
}
