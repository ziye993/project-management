export type FilterField =
  | { type: 'toggle'; key: string; label: string }
  | { type: 'search'; key: string; label?: string; placeholder?: string }
  | { type: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | { type: 'multiSelect'; key: string; label: string; options: { value: string; label: string }[] };

export type FilterValue = Record<string, unknown>;

export type FilterAccessors<T> = Partial<
  Record<string, (item: T) => string | number | boolean | string[] | null | undefined>
>;
