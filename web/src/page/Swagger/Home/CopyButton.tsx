import { useState, type MouseEvent } from 'react'
import { copyTextToClipboard } from '@/utils/clipboard'
import styles from './index.module.less'

interface CopyButtonProps {
  text: string
  label: string
  title?: string
  className?: string
}

export function CopyButton({ text, label, title, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation()
    const ok = await copyTextToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${copied ? styles.copied : ''} ${className}`}
      onClick={handleCopy}
      title={title ?? `复制${label}`}
    >
      {copied ? '已复制' : label}
    </button>
  )
}
