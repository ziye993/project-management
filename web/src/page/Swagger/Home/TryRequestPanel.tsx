import { useEffect, useMemo, useState } from 'react'
import type { MockFieldDefaults } from '../../../type/mockDefaults'
import type { OpenAPISpec, Operation } from '../../../type/openapi'
import { parseJsLiteral } from '../../../utils/jsLiteral'
import {
  formatJsLiteral,
  getParametersSample,
  getRequestBodySample,
} from '../../../utils/schemaSample'
import {
  buildSwaggerRequestUrl,
  formatResponseBody,
  sendSwaggerRequest,
} from '../../../utils/swaggerRequest'
import styles from './index.module.less'

interface TryRequestPanelProps {
  spec: OpenAPISpec
  operation: Operation
  method: string
  path: string
  serverUrl?: string
  cookie?: string
  fieldDefaults?: MockFieldDefaults | null
}

export function TryRequestPanel({
  spec,
  operation,
  method,
  path,
  serverUrl,
  cookie,
  fieldDefaults,
}: TryRequestPanelProps) {
  const hasParams = !!operation.parameters?.length
  const hasBody = !!operation.requestBody
  const showParamsInput = hasParams || ['get', 'delete', 'head'].includes(method.toLowerCase())
  const showBodyInput = hasBody || ['post', 'put', 'patch'].includes(method.toLowerCase())

  const defaultParamsText = useMemo(() => {
    const sample = getParametersSample(spec, operation, fieldDefaults)
    return sample ? formatJsLiteral(sample) : '{}'
  }, [spec, operation, fieldDefaults])

  const defaultBodyText = useMemo(() => {
    const sample = getRequestBodySample(spec, operation, fieldDefaults)
    return sample !== null ? formatJsLiteral(sample) : '{}'
  }, [spec, operation, fieldDefaults])

  const [paramsText, setParamsText] = useState(defaultParamsText)
  const [bodyText, setBodyText] = useState(defaultBodyText)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null)

  useEffect(() => {
    setParamsText(defaultParamsText)
    setBodyText(defaultBodyText)
  }, [defaultParamsText, defaultBodyText])

  const handleSend = async () => {
    if (!serverUrl) {
      setError('文档未配置服务地址，无法发送请求')
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      let params: Record<string, unknown> = {}
      if (showParamsInput && paramsText.trim() && paramsText.trim() !== '{}') {
        const parsed = parseJsLiteral(paramsText)
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Query/Path 参数必须是对象，例如 {page:1}')
        }
        params = parsed as Record<string, unknown>
      }

      let body: unknown
      if (showBodyInput && bodyText.trim() && bodyText.trim() !== '{}') {
        body = parseJsLiteral(bodyText)
      }

      const url = buildSwaggerRequestUrl(serverUrl, path, params)
      const result = await sendSwaggerRequest({
        url,
        method,
        cookie,
        body,
      })

      setResponse({
        status: result.status,
        body: formatResponseBody(result.body),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  if (!serverUrl) {
    return (
      <section className={styles.detailSection}>
        <h4>试请求</h4>
        <p className={styles.tryRequestHint}>文档未包含 servers 地址，无法试请求</p>
      </section>
    )
  }

  return (
    <section className={styles.detailSection}>
      <h4>试请求</h4>
      {cookie && (
        <p className={styles.tryRequestHint}>
          将使用文档 Cookie：<code>{cookie.length > 60 ? `${cookie.slice(0, 60)}…` : cookie}</code>
        </p>
      )}

      <div className={styles.tryRequestForm}>
        {showParamsInput && (
          <label className={styles.tryRequestField}>
            <span className={styles.tryRequestLabel}>Query / Path 参数</span>
            <textarea
              className={styles.tryRequestInput}
              value={paramsText}
              onChange={(e) => setParamsText(e.target.value)}
              placeholder="{page:1,size:10}"
              rows={2}
              spellCheck={false}
            />
          </label>
        )}

        {showBodyInput && (
          <label className={styles.tryRequestField}>
            <span className={styles.tryRequestLabel}>Body</span>
            <textarea
              className={styles.tryRequestInput}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="{id:1,name:'test'}"
              rows={4}
              spellCheck={false}
            />
          </label>
        )}

        {!showParamsInput && !showBodyInput && (
          <p className={styles.tryRequestHint}>此接口无参数和请求体，直接发送即可</p>
        )}

        <div className={styles.tryRequestActions}>
          <button
            type="button"
            className={styles.tryRequestBtn}
            onClick={() => void handleSend()}
            disabled={loading}
          >
            {loading ? '请求中…' : '发送请求'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.tryRequestError} role="alert">
          {error}
        </div>
      )}

      {response && (
        <div className={styles.tryRequestResponse}>
          <div className={styles.tryRequestResponseHeader}>
            <span
              className={`${styles.statusCode} ${
                response.status >= 200 && response.status < 300
                  ? styles.status2
                  : response.status >= 400 && response.status < 500
                    ? styles.status4
                    : response.status >= 500
                      ? styles.status5
                      : ''
              }`}
            >
              {response.status}
            </span>
            <span className={styles.tryRequestResponseLabel}>响应</span>
          </div>
          <pre className={styles.tryRequestResponseBody}>{response.body}</pre>
        </div>
      )}
    </section>
  )
}
