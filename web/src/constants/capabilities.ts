/** 与 server/src/auth/capabilities.js 保持一致 */

export const CAPABILITIES: Record<string, { scope: 'org' | 'project' | 'platform'; title: string; group: string }> = {
  'auth.user.create': { scope: 'org', title: '创建用户', group: 'auth' },
  'auth.user.update': { scope: 'org', title: '更新用户', group: 'auth' },
  'auth.grant': { scope: 'org', title: '授予/收回能力', group: 'auth' },
  'auth.grant.list': { scope: 'org', title: '查看授权列表', group: 'auth' },

  'log.org.read': { scope: 'org', title: '查看租户', group: 'log' },
  'log.org.update': { scope: 'org', title: '更新租户', group: 'log' },
  'log.project.create': { scope: 'org', title: '创建项目', group: 'log' },
  'log.project.update': { scope: 'org', title: '更新项目', group: 'log' },
  'log.project.read': { scope: 'org', title: '查看项目', group: 'log' },

  'log.key.list': { scope: 'project', title: '查看 Key', group: 'log' },
  'log.key.create': { scope: 'project', title: '创建 Key', group: 'log' },
  'log.key.toggle': { scope: 'project', title: '启停 Key', group: 'log' },
  'log.key.delete': { scope: 'project', title: '删除 Key', group: 'log' },

  'log.query': { scope: 'project', title: '查询日志', group: 'log' },
  'log.query.detail': { scope: 'project', title: '日志详情', group: 'log' },

  'module.appStore.write': { scope: 'platform', title: '应用商店写入', group: 'appStore' },
};

export const MODULE_WRITE_CAPS: Record<string, string[]> = {
  log: [
    'log.org.update', 'log.project.create', 'log.project.update',
    'log.key.create', 'log.key.toggle', 'log.key.delete',
  ],
  appStore: ['module.appStore.write'],
  auth: ['auth.user.create', 'auth.user.update', 'auth.grant'],
};

export const MODULE_READ_CAPS: Record<string, string[]> = {
  log: [
    'log.org.read', 'log.project.read', 'log.key.list',
    'log.query', 'log.query.detail',
    ...MODULE_WRITE_CAPS.log,
  ],
  auth: [
    'auth.grant.list', 'auth.user.create', 'auth.user.update', 'auth.grant',
  ],
  appStore: ['module.appStore.write'],
};

export const GROUP_LABELS: Record<string, string> = {
  auth: '权限管理',
  log: '日志中心',
  appStore: '应用商店',
};
