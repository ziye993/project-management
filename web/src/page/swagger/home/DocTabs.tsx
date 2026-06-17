import { PlusOutlined } from '@ant-design/icons'
import type { DocTab } from '../../../type/docTab'
import styles from './index.module.less'

interface DocTabsProps {
  tabs: DocTab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onAdd: () => void
}

export function DocTabs({ tabs, activeTabId, onSelect, onClose, onAdd }: DocTabsProps) {
  return (
    <div className={styles.docTabs}>
      <div className={styles.docTabsList} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`${styles.docTab} ${isActive ? styles.active : ''}`}
              role="tab"
              aria-selected={isActive}
            >
              <button
                type="button"
                className={styles.docTabLabel}
                onClick={() => onSelect(tab.id)}
                title={tab.sourceUrl}
              >
                {tab.label}
              </button>
              <button
                type="button"
                className={styles.docTabClose}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.id)
                }}
                aria-label={`关闭 ${tab.label}`}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" className={styles.docTabAdd} onClick={onAdd} title="加载新文档">
        <PlusOutlined />
      </button>
    </div>
  )
}
