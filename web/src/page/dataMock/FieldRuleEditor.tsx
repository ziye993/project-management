import { useMemo } from 'react'
import type { OpenAPISpec, SchemaObject } from '../../type/openapi'
import { resolveSchema } from '../../utils/openapi'
import {
  arrayItemsPath,
  getArrayLength,
  inferLeafType,
  joinFieldPath,
  setArrayLength,
  setFieldRule,
  type ArrayLengthsMap,
  type FieldRule,
  type FieldRuleMode,
  type FieldRulesMap,
} from '../../utils/mockRules'
import styles from './index.module.less'

interface FieldRuleEditorProps {
  spec: OpenAPISpec
  schema: SchemaObject
  fieldRules: FieldRulesMap
  arrayLengths: ArrayLengthsMap
  onFieldRulesChange: (rules: FieldRulesMap) => void
  onArrayLengthsChange: (lengths: ArrayLengthsMap) => void
}

function RuleModeSelect({
  value,
  onChange,
  options,
}: {
  value: FieldRuleMode
  onChange: (mode: FieldRuleMode) => void
  options: { value: FieldRuleMode; label: string }[]
}) {
  return (
    <select
      className={styles.ruleSelect}
      value={value}
      onChange={(e) => onChange(e.target.value as FieldRuleMode)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function LeafRuleInput({
  path,
  schema,
  rule,
  onChange,
}: {
  path: string
  schema: SchemaObject
  rule?: FieldRule
  onChange: (path: string, rule: FieldRule | null) => void
}) {
  const leafType = inferLeafType(schema)
  const mode = rule?.mode ?? 'default'

  if (leafType === 'boolean') {
    const boolValue =
      mode === 'fixed' && typeof rule?.value === 'boolean'
        ? String(rule.value)
        : mode === 'random'
          ? 'random'
          : 'default'

    return (
      <select
        className={styles.ruleSelect}
        value={boolValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'default') onChange(path, null)
          else if (v === 'random') onChange(path, { mode: 'random' })
          else onChange(path, { mode: 'fixed', value: v === 'true' })
        }}
      >
        <option value="default">随机（默认）</option>
        <option value="true">true</option>
        <option value="false">false</option>
        <option value="random">随机</option>
      </select>
    )
  }

  if (leafType === 'enum' && schema.enum?.length) {
    const enumValue =
      mode === 'fixed' ? String(rule?.value ?? '') : mode === 'random' ? 'random' : 'default'

    return (
      <select
        className={styles.ruleSelect}
        value={enumValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'default') onChange(path, null)
          else if (v === 'random') onChange(path, { mode: 'random' })
          else onChange(path, { mode: 'fixed', value: v })
        }}
      >
        <option value="default">随机（默认）</option>
        {schema.enum.map((item) => (
          <option key={String(item)} value={String(item)}>
            {String(item)}
          </option>
        ))}
        <option value="random">随机</option>
      </select>
    )
  }

  const modeOptions: { value: FieldRuleMode; label: string }[] = [
    { value: 'default', label: '随机（默认）' },
    { value: 'fixed', label: '固定值' },
    { value: 'increment', label: '自增' },
    { value: 'now', label: '当前时间' },
    { value: 'timeOffset', label: '时间偏移' },
  ]

  if (leafType === 'string' || leafType === 'number' || leafType === 'integer') {
    return (
      <div className={styles.leafRuleRow}>
        <RuleModeSelect
          value={mode}
          onChange={(m) => {
            if (m === 'default') onChange(path, null)
            else if (m === 'now' || m === 'timeOffset') onChange(path, { mode: m })
            else if (m === 'increment') onChange(path, { mode: m, start: 1 })
            else onChange(path, { mode: m, value: leafType === 'number' || leafType === 'integer' ? 0 : '' })
          }}
          options={modeOptions.filter((o) =>
            leafType === 'string' ? true : o.value !== 'now' && o.value !== 'timeOffset',
          )}
        />
        {mode === 'fixed' && (
          <input
            className={styles.ruleInput}
            type={leafType === 'number' || leafType === 'integer' ? 'number' : 'text'}
            value={
              rule?.value === undefined || rule?.value === null
                ? ''
                : String(rule.value)
            }
            onChange={(e) => {
              const raw = e.target.value
              const value =
                leafType === 'number' || leafType === 'integer' ? Number(raw) : raw
              onChange(path, { mode: 'fixed', value })
            }}
            placeholder="固定值"
          />
        )}
        {mode === 'increment' && (
          <input
            className={styles.ruleInputSm}
            type="number"
            value={rule?.start ?? 1}
            onChange={(e) =>
              onChange(path, { mode: 'increment', start: Number(e.target.value) || 1 })
            }
            placeholder="起始值"
          />
        )}
        {mode === 'timeOffset' && (
          <input
            className={styles.ruleInputSm}
            type="number"
            value={rule?.offsetHours ?? 1}
            onChange={(e) =>
              onChange(path, {
                mode: 'timeOffset',
                offsetHours: Number(e.target.value) || 1,
              })
            }
            placeholder="小时/行"
          />
        )}
      </div>
    )
  }

  return (
    <span className={styles.ruleHint}>随机（默认）</span>
  )
}

function SchemaRuleNode({
  spec,
  schema,
  name,
  path,
  depth,
  fieldRules,
  arrayLengths,
  onFieldRulesChange,
  onArrayLengthsChange,
}: {
  spec: OpenAPISpec
  schema: SchemaObject
  name?: string
  path: string
  depth: number
  fieldRules: FieldRulesMap
  arrayLengths: ArrayLengthsMap
  onFieldRulesChange: (rules: FieldRulesMap) => void
  onArrayLengthsChange: (lengths: ArrayLengthsMap) => void
}) {
  const resolved = resolveSchema(spec, schema)
  const { type, properties, items, allOf, oneOf, anyOf } = resolved

  const handleRuleChange = (fieldPath: string, rule: FieldRule | null) => {
    onFieldRulesChange(setFieldRule(fieldRules, fieldPath, rule))
  }

  if (allOf?.length) {
    return (
      <>
        {allOf.map((part, i) => (
          <SchemaRuleNode
            key={i}
            spec={spec}
            schema={part}
            name={name}
            path={path}
            depth={depth}
            fieldRules={fieldRules}
            arrayLengths={arrayLengths}
            onFieldRulesChange={onFieldRulesChange}
            onArrayLengthsChange={onArrayLengthsChange}
          />
        ))}
      </>
    )
  }

  if (oneOf?.length || anyOf?.length) {
    const variants = oneOf ?? anyOf!
    return (
      <SchemaRuleNode
        spec={spec}
        schema={variants[0]}
        name={name}
        path={path}
        depth={depth}
        fieldRules={fieldRules}
        arrayLengths={arrayLengths}
        onFieldRulesChange={onFieldRulesChange}
        onArrayLengthsChange={onArrayLengthsChange}
      />
    )
  }

  if (type === 'array' || items) {
    const length = getArrayLength(arrayLengths, path)
    const itemsPath = arrayItemsPath(path)

    return (
      <div className={styles.ruleNode} style={{ paddingLeft: depth * 14 }}>
        {name && (
          <div className={styles.ruleNodeHeader}>
            <span className={styles.ruleFieldName}>{name}</span>
            <span className={styles.typeBadge}>array</span>
            <label className={styles.arrayLengthLabel}>
              长度
              <input
                className={styles.ruleInputSm}
                type="number"
                min={0}
                max={100}
                value={length}
                onChange={(e) =>
                  onArrayLengthsChange(
                    setArrayLength(arrayLengths, path, Number(e.target.value) || 0),
                  )
                }
              />
            </label>
          </div>
        )}
        {items && (
          <SchemaRuleNode
            spec={spec}
            schema={items}
            path={itemsPath}
            depth={depth + 1}
            fieldRules={fieldRules}
            arrayLengths={arrayLengths}
            onFieldRulesChange={onFieldRulesChange}
            onArrayLengthsChange={onArrayLengthsChange}
          />
        )}
      </div>
    )
  }

  if (properties || type === 'object' || (!type && properties)) {
    return (
      <div className={styles.ruleNode} style={{ paddingLeft: depth * 14 }}>
        {name && (
          <div className={styles.ruleNodeHeader}>
            <span className={styles.ruleFieldName}>{name}</span>
            <span className={styles.typeBadge}>{type ?? 'object'}</span>
          </div>
        )}
        <div className={styles.ruleChildren}>
          {Object.entries(properties ?? {}).map(([key, prop]) => (
            <SchemaRuleNode
              key={key}
              spec={spec}
              schema={prop}
              name={key}
              path={joinFieldPath(path, key)}
              depth={depth + 1}
              fieldRules={fieldRules}
              arrayLengths={arrayLengths}
              onFieldRulesChange={onFieldRulesChange}
              onArrayLengthsChange={onArrayLengthsChange}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.ruleLeaf} style={{ paddingLeft: depth * 14 }}>
      {name && <span className={styles.ruleFieldName}>{name}</span>}
      <span className={styles.typeBadge}>{inferLeafType(resolved)}</span>
      <LeafRuleInput
        path={path}
        schema={resolved}
        rule={fieldRules[path]}
        onChange={handleRuleChange}
      />
    </div>
  )
}

export function FieldRuleEditor({
  spec,
  schema,
  fieldRules,
  arrayLengths,
  onFieldRulesChange,
  onArrayLengthsChange,
}: FieldRuleEditorProps) {
  const resolved = useMemo(() => resolveSchema(spec, schema), [spec, schema])

  return (
    <div className={styles.ruleEditor}>
      <h3 className={styles.sectionTitle}>响应字段规则</h3>
      <p className={styles.sectionHint}>
        未配置的字段将按类型随机生成；数组内字段可使用自增、时间偏移等规则。
      </p>
      <SchemaRuleNode
        spec={spec}
        schema={resolved}
        path=""
        depth={0}
        fieldRules={fieldRules}
        arrayLengths={arrayLengths}
        onFieldRulesChange={onFieldRulesChange}
        onArrayLengthsChange={onArrayLengthsChange}
      />
    </div>
  )
}
