import { useState, type MouseEvent } from 'react'
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
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
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
