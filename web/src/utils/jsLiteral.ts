/** Parse JS object literal like `{id:1,name:'foo'}` (not strict JSON). */
export function parseJsLiteral(input: string): unknown {
  const trimmed = input.trim()
  if (!trimmed) return {}

  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${trimmed})`)()
  } catch {
    throw new Error(`无法解析对象: ${trimmed.slice(0, 80)}`)
  }
}
