import type { FilterAccessors, FilterValue } from './types';

/**
 * Pure client-side filter. accessors[key] extracts comparable value from each item.
 * Keys without an accessor are ignored (caller may filter those separately).
 *
 * Value semantics:
 * - boolean → treat as toggle: when true, item value must be truthy
 * - string → case-insensitive substring match
 * - string[] → item value (or list) must intersect selected values
 * - other → strict equality via String()
 */
export function applyFilters<T>(
  items: T[],
  value: FilterValue,
  accessors: FilterAccessors<T> = {},
): T[] {
  if (!items?.length) return [];
  const entries = Object.entries(value || {}).filter(([key]) => accessors[key]);
  if (!entries.length) return items;

  return items.filter((item) => {
    for (const [key, rawVal] of entries) {
      const fieldVal = accessors[key]!(item);

      if (typeof rawVal === 'boolean') {
        if (rawVal && !fieldVal) return false;
        continue;
      }

      if (Array.isArray(rawVal)) {
        if (!rawVal.length) continue;
        const values = Array.isArray(fieldVal) ? fieldVal.map(String) : [String(fieldVal ?? '')];
        if (!rawVal.some((s) => values.includes(String(s)))) return false;
        continue;
      }

      if (typeof rawVal === 'string') {
        const needle = rawVal.trim().toLowerCase();
        if (!needle) continue;
        if (!String(fieldVal ?? '').toLowerCase().includes(needle)) return false;
        continue;
      }

      if (rawVal != null && String(fieldVal ?? '') !== String(rawVal)) return false;
    }
    return true;
  });
}
