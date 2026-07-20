/** 可在系统配置中调整的模块（不含日志、权限管理） */
export const CONFIGURABLE_MODULES = [
  { key: 'project', name: '代码管理' },
  { key: 'image', name: '图像' },
  { key: 'television', name: '影视' },
  { key: 'config', name: '系统配置' },
  { key: 'serverInfo', name: '服务器状态' },
  { key: 'LANSharing', name: '局域网共享' },
  { key: 'swagger', name: 'Swagger' },
  { key: 'dataMock', name: '数据 Mock' },
  { key: 'game', name: '游戏' },
  { key: 'localChat', name: '局域网对话' },
  { key: 'planeEditor', name: '平面布局编辑器' },
  { key: 'imageCrypto', name: '图片加解密' },
  { key: 'calc', name: '计算' },
  { key: 'appStore', name: '应用商店' },
] as const;

export type ConfigurableModuleKey = (typeof CONFIGURABLE_MODULES)[number]['key'];

export type ModuleAccessMode = 'default' | 'requireLogin' | 'hidden';

export interface ModuleAccessConfig {
  requireLogin: string[];
  hidden: string[];
}

const CONFIGURABLE_KEYS = new Set<string>(CONFIGURABLE_MODULES.map(m => m.key));

export function normalizeModuleAccess(raw?: Partial<ModuleAccessConfig> | null): ModuleAccessConfig {
  const requireLogin: string[] = [];
  const hidden: string[] = [];

  if (Array.isArray(raw?.requireLogin)) {
    for (const key of raw.requireLogin) {
      if (typeof key === 'string' && CONFIGURABLE_KEYS.has(key) && !hidden.includes(key)) {
        requireLogin.push(key);
      }
    }
  }
  if (Array.isArray(raw?.hidden)) {
    for (const key of raw.hidden) {
      if (typeof key === 'string' && CONFIGURABLE_KEYS.has(key) && !hidden.includes(key)) {
        hidden.push(key);
      }
    }
  }

  return {
    requireLogin: requireLogin.filter(key => !hidden.includes(key)),
    hidden,
  };
}

export function moduleAccessFromModes(modes: Record<string, ModuleAccessMode>): ModuleAccessConfig {
  const requireLogin: string[] = [];
  const hidden: string[] = [];
  for (const { key } of CONFIGURABLE_MODULES) {
    const mode = modes[key] ?? 'default';
    if (mode === 'requireLogin') requireLogin.push(key);
    else if (mode === 'hidden') hidden.push(key);
  }
  return normalizeModuleAccess({ requireLogin, hidden });
}

export function modesFromModuleAccess(config?: ModuleAccessConfig | null): Record<string, ModuleAccessMode> {
  const normalized = normalizeModuleAccess(config);
  const modes: Record<string, ModuleAccessMode> = {};
  for (const { key } of CONFIGURABLE_MODULES) {
    if (normalized.hidden.includes(key)) modes[key] = 'hidden';
    else if (normalized.requireLogin.includes(key)) modes[key] = 'requireLogin';
    else modes[key] = 'default';
  }
  return modes;
}
