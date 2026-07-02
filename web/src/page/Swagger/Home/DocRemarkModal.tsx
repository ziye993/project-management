import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import styles from './index.module.less'

interface DocRemarkModalProps {
  open: boolean
  remark: string
  onClose: () => void
  onSave: (remark: string) => void
}

export function DocRemarkModal({ open, remark, onClose, onSave }: DocRemarkModalProps) {
  const [value, setValue] = useState(remark)

  useEffect(() => {
    if (open) setValue(remark)
  }, [open, remark])

  const handleSave = () => {
    onSave(value.trim())
    onClose()
  }

  return (
    <Modal open={open} title="文档备注" onClose={onClose} onOK={handleSave} width={420}>
      <div className={styles.remarkModalBody}>
        <label className={styles.remarkModalLabel} htmlFor="doc-remark">
          备注内容
        </label>
        <input
          id="doc-remark"
          type="text"
          className={styles.remarkModalInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="例如：用户中心 · 测试环境"
          autoFocus
        />
        <p className={styles.remarkModalHint}>设置后顶部 Tab 将显示备注；留空则显示文档地址</p>
      </div>
    </Modal>
  )
}
