import type { FilterField, FilterValue } from './types';
import styles from './index.module.less';

interface ListFilterBarProps {
  fields: FilterField[];
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  className?: string;
}

export default function ListFilterBar(props: ListFilterBarProps) {
  const { fields, value, onChange, className } = props;

  const setKey = (key: string, next: unknown) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className={`${styles.bar} ${className || ''}`}>
      {fields.map((field) => {
        if (field.type === 'toggle') {
          return (
            <label key={field.key} className={styles.toggle}>
              <input
                type="checkbox"
                checked={Boolean(value[field.key])}
                onChange={(e) => setKey(field.key, e.target.checked)}
              />
              {field.label}
            </label>
          );
        }

        if (field.type === 'search') {
          return (
            <label key={field.key} className={styles.search}>
              {field.label ? <span className={styles.label}>{field.label}</span> : null}
              <input
                type="search"
                value={String(value[field.key] ?? '')}
                placeholder={field.placeholder || '搜索'}
                onChange={(e) => setKey(field.key, e.target.value)}
              />
            </label>
          );
        }

        if (field.type === 'select') {
          return (
            <label key={field.key} className={styles.select}>
              <span className={styles.label}>{field.label}</span>
              <select
                value={String(value[field.key] ?? '')}
                onChange={(e) => setKey(field.key, e.target.value)}
              >
                <option value="">全部</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          );
        }

        const selected = Array.isArray(value[field.key])
          ? (value[field.key] as string[])
          : [];
        return (
          <div key={field.key} className={styles.multiSelect}>
            <span className={styles.label}>{field.label}</span>
            <div className={styles.chipRow}>
              {field.options.map((opt) => {
                const active = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                    onClick={() => {
                      const next = active
                        ? selected.filter((v) => v !== opt.value)
                        : [...selected, opt.value];
                      setKey(field.key, next);
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { FilterField, FilterValue } from './types';
export { applyFilters } from './applyFilters';
