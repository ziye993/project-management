import { useMemo } from 'react'
import { parseStaticResponseText } from '../../utils/dataMockStorage'
import styles from './index.module.less'

interface StaticResponseEditorProps {
  value: string
  onChange: (text: string) => void
}

export function StaticResponseEditor({ value, onChange }: StaticResponseEditorProps) {
  const parseResult = useMemo(() => parseStaticResponseText(value), [value])
  const hasStaticJson = parseResult.ok && !('empty' in parseResult && parseResult.empty)

  return (
    <div className={styles.staticResponseEditor}>
      <h3 className={styles.sectionTitle}>直接返回 JSON</h3>
      <p className={styles.sectionHint}>
        粘贴有效 JSON 后，Mock 将直接返回该内容；留空则按下方字段规则生成响应。
      </p>
      <textarea
        className={styles.staticResponseTextarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'{\n  "code": 0,\n  "success": true,\n  "data": {}\n}'}
        spellCheck={false}
      />
      {value.trim() && !parseResult.ok && (
        <div className={styles.staticResponseError} role="alert">
          {parseResult.error}
        </div>
      )}
      {hasStaticJson && (
        <div className={styles.staticResponseActive}>已启用：将直接返回粘贴的 JSON</div>
      )}
    </div>
  )
}

export function staticResponseForApi(text: string): unknown | undefined {
  const parsed = parseStaticResponseText(text)
  if (!parsed.ok || ('empty' in parsed && parsed.empty)) return undefined
  return parsed?.value
}

export function isStaticResponseValid(text: string): boolean {
  const parsed = parseStaticResponseText(text)
  return parsed.ok
}
