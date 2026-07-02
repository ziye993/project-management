import { useMemo, useState } from 'react'
import type { MockFieldDefaults } from '../../../type/mockDefaults'
import type { OpenAPISpec, ParsedEndpoint } from '../../../type/openapi'
import {
  buildApiUrl,
  formatJsLiteral,
  getRequestBodySample,
} from '../../../utils/schemaSample'
import {
  getRequestTsInterface,
  getResponse200TsInterface,
} from '../../../utils/schemaTypeScript'
import { CopyButton } from './CopyButton'
import { SchemaTree } from './SchemaTree'
import { TryRequestPanel } from './TryRequestPanel'
import styles from './index.module.less'

const METHOD_COLORS: Record<string, string> = {
  get: styles.methodGet,
  post: styles.methodPost,
  put: styles.methodPut,
  delete: styles.methodDelete,
  patch: styles.methodPatch,
  head: styles.methodHead,
  options: styles.methodOptions,
}

const STATUS_CLASSES: Record<string, string> = {
  '2': styles.status2,
  '4': styles.status4,
  '5': styles.status5,
}

interface EndpointCardProps {
  spec: OpenAPISpec
  endpoint: ParsedEndpoint
  serverUrl?: string
  cookie?: string
  fieldDefaults?: MockFieldDefaults | null
}

export function EndpointCard({ spec, endpoint, serverUrl, cookie, fieldDefaults }: EndpointCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { path, method, operation } = endpoint
  const methodClass = METHOD_COLORS[method] ?? styles.methodDefault

  const apiUrl = useMemo(() => {
    if (!serverUrl) return path
    return buildApiUrl(serverUrl, path)
  }, [serverUrl, path])

  const apiCopyText = useMemo(
    () => `${method.toUpperCase()} ${apiUrl}`,
    [method, apiUrl],
  )

  const bodySample = useMemo(
    () => getRequestBodySample(spec, operation),
    [spec, operation],
  )

  const bodyCopyText = useMemo(
    () => (bodySample !== null ? formatJsLiteral(bodySample) : ''),
    [bodySample],
  )

  const requestTsText = useMemo(
    () => getRequestTsInterface(spec, path, operation),
    [spec, path, operation],
  )

  const responseTsText = useMemo(
    () => getResponse200TsInterface(spec, path, operation),
    [spec, path, operation],
  )

  return (
    <div className={`${styles.endpointCard} ${expanded ? styles.expanded : ''}`}>
      <div className={styles.endpointHeaderRow}>
        <button
          type="button"
          className={styles.endpointHeader}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span className={`${styles.methodBadge} ${methodClass}`}>{method.toUpperCase()}</span>
          <code className={styles.endpointPath}>{path}</code>
          <span className={styles.endpointSummary}>{operation.summary ?? operation.operationId}</span>
          <span className={styles.expandIcon}>{expanded ? '▾' : '▸'}</span>
        </button>

        <div className={styles.endpointActions}>
          <CopyButton text={apiCopyText} label="复制 API" title={apiCopyText} />
          {bodyCopyText && (
            <CopyButton text={bodyCopyText} label="复制入参" title={bodyCopyText} />
          )}
          {/* {requestTsText && (
            <CopyButton text={requestTsText} label="复制 TS 入参" title={requestTsText} />
          )}
          {responseTsText && (
            <CopyButton text={responseTsText} label="复制 TS 出参" title={responseTsText} />
          )} */}
        </div>
      </div>

      {expanded && (
        <div className={styles.endpointBody}>
          {operation.description && operation.description !== operation.summary && (
            <p className={styles.endpointDescription}>{operation.description}</p>
          )}

          {operation.operationId && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Operation ID</span>
              <code>{operation.operationId}</code>
            </div>
          )}

          {operation.parameters?.length && (
            <section className={styles.detailSection}>
              <div className={styles.sectionHeader}>
                <h4>请求参数</h4>
                {requestTsText && (
                  <div className={styles.sectionActions}>
                    <CopyButton text={requestTsText} label="复制 TS 类型" title={requestTsText} />
                  </div>
                )}
              </div>
              <table className={styles.paramTable}>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>位置</th>
                    <th>必填</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {operation.parameters.map((p) => (
                    <tr key={`${p.in}-${p.name}`}>
                      <td><code>{p.name}</code></td>
                      <td>{p.in}</td>
                      <td>{p.required ? '是' : '否'}</td>
                      <td>{p.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {operation.requestBody && (
            <section className={styles.detailSection}>
              <div className={styles.sectionHeader}>
                <h4>
                  请求体
                  {operation.requestBody.required && <span className={styles.requiredTag}>必填</span>}
                </h4>
                <div className={styles.sectionActions}>
                  {bodyCopyText && <CopyButton text={bodyCopyText} label="复制入参" />}
                  {requestTsText && (
                    <CopyButton text={requestTsText} label="复制 TS 类型" title={requestTsText} />
                  )}
                </div>
              </div>
              {Object.entries(operation.requestBody.content).map(([mediaType, content]) => (
                <div key={mediaType} className={styles.mediaBlock}>
                  <div className={styles.mediaType}>{mediaType}</div>
                  {content.schema && <SchemaTree spec={spec} schema={content.schema} />}
                </div>
              ))}
            </section>
          )}

          <section className={styles.detailSection}>
            <h4>响应</h4>
            {Object.entries(operation.responses).map(([status, response]) => (
              <div key={status} className={styles.responseBlock}>
                <div className={styles.responseHeader}>
                  <div className={styles.responseHeaderMain}>
                    <span
                      className={`${styles.statusCode} ${STATUS_CLASSES[status.charAt(0)] ?? ''}`}
                    >
                      {status}
                    </span>
                    <span>{response.description}</span>
                  </div>
                  {status === '200' && responseTsText && (
                    <CopyButton text={responseTsText} label="复制 TS 类型" title={responseTsText} />
                  )}
                </div>
                {response.content &&
                  Object.entries(response.content).map(([mediaType, content]) => (
                    <div key={mediaType} className={styles.mediaBlock}>
                      <div className={styles.mediaType}>{mediaType}</div>
                      {content.schema && <SchemaTree spec={spec} schema={content.schema} />}
                      {content.examples && (
                        <div className={styles.examples}>
                          {Object.entries(content.examples).map(([key, ex]) => (
                            <pre key={key} className={styles.exampleValue}>
                              {typeof ex.value === 'string'
                                ? ex.value
                                : JSON.stringify(ex.value, null, 2)}
                            </pre>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </section>

          {operation.security && (
            <section className={styles.detailSection}>
              <h4>安全认证</h4>
              <div className={styles.securityTags}>
                {operation.security.flatMap((s) =>
                  Object.keys(s).map((scheme) => (
                    <span key={scheme} className={styles.securityTag}>{scheme}</span>
                  )),
                )}
              </div>
            </section>
          )}

          <TryRequestPanel
            spec={spec}
            operation={operation}
            method={method}
            path={path}
            serverUrl={serverUrl}
            cookie={cookie}
            fieldDefaults={fieldDefaults}
          />
        </div>
      )}
    </div>
  )
}
