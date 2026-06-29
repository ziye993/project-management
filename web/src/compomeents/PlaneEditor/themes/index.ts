import { rectTheme } from './rectTheme';
import { imageTheme } from './imageTheme';
import type { PlaneTheme, PlaneThemePageDefaults } from './types';

export * from './types';

const themeRegistry: PlaneTheme[] = [rectTheme, imageTheme];

export const themeOptions = themeRegistry.map(t => ({
  label: t.label,
  value: t.id,
}));

export function getTheme(id: string): PlaneTheme {
  return themeRegistry.find(t => t.id === id) ?? rectTheme;
}

export function getThemePageDefaults(id: string): PlaneThemePageDefaults {
  return getTheme(id).pageDefaults;
}

export function listThemes(): PlaneTheme[] {
  return [...themeRegistry];
}

/** 注册新主题 — 只需调用此函数追加配置 */
export function registerTheme(theme: PlaneTheme): void {
  const idx = themeRegistry.findIndex(t => t.id === theme.id);
  if (idx >= 0) themeRegistry[idx] = theme;
  else themeRegistry.push(theme);
}
