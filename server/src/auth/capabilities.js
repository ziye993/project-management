/** 能力目录（代码常量，不落库） */
export const CAPABILITIES = {
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

/** 创建租户时授予首个管理员（org 作用域） */
export const PRESET_TENANT_ADMIN = [
  'auth.user.create', 'auth.user.update', 'auth.grant', 'auth.grant.list',
  'log.org.read', 'log.org.update',
  'log.project.create', 'log.project.update', 'log.project.read',
  'log.key.list', 'log.key.create', 'log.key.toggle', 'log.key.delete',
  'log.query', 'log.query.detail',
];

/** 模块写能力：用于 computeModuleCapabilities */
export const MODULE_WRITE_CAPS = {
  log: [
    'log.org.update', 'log.project.create', 'log.project.update',
    'log.key.create', 'log.key.toggle', 'log.key.delete',
  ],
  appStore: ['module.appStore.write'],
  auth: ['auth.user.create', 'auth.user.update', 'auth.grant'],
};

export const MODULE_READ_CAPS = {
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

export function getCapabilityMeta(capability) {
  return CAPABILITIES[capability] || null;
}

export function listCapabilityCatalog() {
  return Object.entries(CAPABILITIES).map(([id, meta]) => ({
    id,
    ...meta,
  }));
}
