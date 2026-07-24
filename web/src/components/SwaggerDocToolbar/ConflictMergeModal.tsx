import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import type {
  ConflictChoice,
  DocConflict,
  SwaggerMergePlan,
} from '@/utils/swaggerDiff'
import styles from './ConflictMergeModal.module.less'

interface ConflictMergeModalProps {
  open: boolean
  plan: SwaggerMergePlan | null
  submitting?: boolean
  onClose: () => void
  onConfirm: (choices: Record<string, ConflictChoice>) => void | Promise<void>
}

export default function ConflictMergeModal({
  open,
  plan,
  submitting = false,
  onClose,
  onConfirm,
}: ConflictMergeModalProps) {
  const conflicts = plan?.conflicts ?? []
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({})
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !plan) return
    const initial: Record<string, ConflictChoice> = {}
    for (const conflict of plan.conflicts) {
      initial[conflict.key] = 'local'
    }
    setChoices(initial)
    setExpandedKey(null)
  }, [open, plan])

  const summary = useMemo(() => {
    if (!plan) return null
    return {
      conflictCount: plan.conflicts.length,
      localOnly: plan.localOnly.length,
      remoteOnly: plan.remoteOnly.length,
      identical: plan.identical.length,
    }
  }, [plan])

  const expanded: DocConflict | null = useMemo(() => {
    if (!expandedKey) return null
    return conflicts.find((c) => c.key === expandedKey) ?? null
  }, [conflicts, expandedKey])

  const handleConfirm = async () => {
    await onConfirm(choices)
  }

  return (
    <Modal
      open={open}
      title="合并冲突"
      onClose={onClose}
      onOK={() => void handleConfirm()}
      width={720}
    >
      <div className={styles.body}>
        {summary && (
          <p className={styles.summary}>
            冲突 {summary.conflictCount} 个
            {summary.remoteOnly > 0 ? ` · 将新增服务端文档 ${summary.remoteOnly} 个` : ''}
            {summary.localOnly > 0 ? ` · 保留本地独有 ${summary.localOnly} 个` : ''}
            {summary.identical > 0 ? ` · 相同 ${summary.identical} 个` : ''}
          </p>
        )}

        {conflicts.length === 0 ? (
          <p className={styles.empty}>没有冲突，可直接合并。</p>
        ) : (
          <ul className={styles.conflictList}>
            {conflicts.map((conflict) => {
              const isOpen = expandedKey === conflict.key
              return (
                <li key={conflict.key} className={styles.conflictItem}>
                  <div className={styles.conflictRow}>
                    <button
                      type="button"
                      className={styles.docNameBtn}
                      onClick={() => setExpandedKey(isOpen ? null : conflict.key)}
                    >
                      <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
                      <span className={styles.docName}>{conflict.label}</span>
                      <span className={styles.diffCount}>{conflict.diffs.length} 处差异</span>
                    </button>
                    <div className={styles.choiceGroup} role="radiogroup" aria-label={`选择 ${conflict.label}`}>
                      <label className={styles.choice}>
                        <input
                          type="radio"
                          name={`choice-${conflict.key}`}
                          checked={choices[conflict.key] === 'local'}
                          disabled={submitting}
                          onChange={() =>
                            setChoices((prev) => ({ ...prev, [conflict.key]: 'local' }))
                          }
                        />
                        本地
                      </label>
                      <label className={styles.choice}>
                        <input
                          type="radio"
                          name={`choice-${conflict.key}`}
                          checked={choices[conflict.key] === 'remote'}
                          disabled={submitting}
                          onChange={() =>
                            setChoices((prev) => ({ ...prev, [conflict.key]: 'remote' }))
                          }
                        />
                        服务端
                      </label>
                    </div>
                  </div>

                  {isOpen && expanded && (
                    <div className={styles.diffPanel}>
                      <p className={styles.diffHint}>以下为格式化差异摘要（不含原始 JSON）</p>
                      <ul className={styles.diffList}>
                        {expanded.diffs.map((diff, index) => (
                          <li key={`${diff.method}-${diff.path}-${index}`} className={styles.diffItem}>
                            {diff.method && diff.path ? (
                              <div className={styles.endpoint}>
                                <span className={styles.method}>{diff.method}</span>
                                <code className={styles.path}>{diff.path}</code>
                              </div>
                            ) : null}
                            <ul className={styles.kindList}>
                              {diff.summaries.map((text) => (
                                <li key={text}>{text}</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <p className={styles.footerHint}>
          确认后将按你的选择同时更新本地与服务端，完成一次同步。
        </p>
      </div>
    </Modal>
  )
}
