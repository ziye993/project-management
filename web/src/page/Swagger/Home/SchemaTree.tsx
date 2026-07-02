import type { OpenAPISpec, SchemaObject } from '../../../type/openapi'
import { resolveSchema } from '../../../utils/openapi'
import styles from './index.module.less'

interface SchemaTreeProps {
  spec: OpenAPISpec
  schema: SchemaObject
  name?: string
  depth?: number
}

function TypeBadge({ type, format }: { type?: string; format?: string }) {
  const label = format ? `${type} (${format})` : type ?? 'any'
  return <span className={styles.typeBadge}>{label}</span>
}

function SchemaNode({ spec, schema, name, depth = 0 }: SchemaTreeProps) {
  const resolved = resolveSchema(spec, schema)
  const { type, description, properties, items, required, enum: enumValues, allOf, oneOf, anyOf } = resolved

  if (allOf?.length) {
    return (
      <div className={styles.schemaNode} style={{ paddingLeft: depth * 12 }}>
        {name && <div className={styles.schemaFieldName}>{name}</div>}
        {allOf.map((s, i) => (
          <SchemaNode key={i} spec={spec} schema={s} depth={depth + 1} />
        ))}
      </div>
    )
  }

  if (oneOf?.length || anyOf?.length) {
    const variants = oneOf ?? anyOf!
    return (
      <div className={styles.schemaNode} style={{ paddingLeft: depth * 12 }}>
        {name && (
          <div className={styles.schemaFieldHeader}>
            <span className={styles.schemaFieldName}>{name}</span>
            <span className={styles.schemaVariantLabel}>{oneOf ? 'oneOf' : 'anyOf'}</span>
          </div>
        )}
        {variants.map((s, i) => (
          <SchemaNode key={i} spec={spec} schema={s} depth={depth + 1} />
        ))}
      </div>
    )
  }

  if (type === 'array' && items) {
    return (
      <div className={styles.schemaNode} style={{ paddingLeft: depth * 12 }}>
        {name && (
          <div className={styles.schemaFieldHeader}>
            <span className={styles.schemaFieldName}>{name}</span>
            <TypeBadge type="array" />
            {description && <span className={styles.schemaDesc}>{description}</span>}
          </div>
        )}
        <SchemaNode spec={spec} schema={items} depth={depth + 1} />
      </div>
    )
  }

  if (properties) {
    return (
      <div className={styles.schemaNode} style={{ paddingLeft: depth * 12 }}>
        {name && (
          <div className={styles.schemaFieldHeader}>
            <span className={styles.schemaFieldName}>{name}</span>
            <TypeBadge type={type ?? 'object'} />
            {description && <span className={styles.schemaDesc}>{description}</span>}
          </div>
        )}
        <div className={styles.schemaProperties}>
          {Object.entries(properties).map(([key, prop]) => (
            <SchemaNode
              key={key}
              spec={spec}
              schema={prop}
              name={required?.includes(key) ? `${key} *` : key}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.schemaLeaf} style={{ paddingLeft: depth * 12 }}>
      {name && <span className={styles.schemaFieldName}>{name}</span>}
      <TypeBadge type={type} format={resolved.format} />
      {enumValues && (
        <span className={styles.schemaEnum}>
          {enumValues.map(String).join(' | ')}
        </span>
      )}
      {description && <span className={styles.schemaDesc}>{description}</span>}
    </div>
  )
}

export function SchemaTree({ spec, schema }: SchemaTreeProps) {
  return (
    <div className={styles.schemaTree}>
      <SchemaNode spec={spec} schema={schema} />
    </div>
  )
}
