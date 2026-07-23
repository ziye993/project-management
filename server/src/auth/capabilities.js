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

  'log.query': { scope: 'project', title: '查询普通日志', group: 'log' },
  'log.query.detail': { scope: 'project', title: '普通日志详情', group: 'log' },

  'module.project.access': { scope: 'platform', title: '代码管理', group: 'modules' },
  'module.image.access': { scope: 'platform', title: '图像', group: 'modules' },
  'module.television.access': { scope: 'platform', title: '影视', group: 'modules' },
  'module.config.access': { scope: 'platform', title: '系统配置', group: 'modules' },
  'module.serverInfo.access': { scope: 'platform', title: '服务器状态', group: 'modules' },
  'module.LANSharing.access': { scope: 'platform', title: '局域网共享', group: 'modules' },
  'module.swagger.access': { scope: 'platform', title: 'Swagger', group: 'modules' },
  'module.dataMock.access': { scope: 'platform', title: '数据 Mock', group: 'modules' },
  'module.planeEditor.access': { scope: 'platform', title: '平面布局编辑器', group: 'modules' },
  'module.imageCrypto.access': { scope: 'platform', title: '图片加解密', group: 'modules' },
  'module.calc.access': { scope: 'platform', title: '计算', group: 'modules' },
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

/**
 * 推导模块入口：持有任一即展示/可读该模块
 * auth 含租户工作台相关 log.*（页面已迁到权限管理）
 * 本地工具：module.*.access（平台级 org+0）
 */
export const MODULE_ENTRY_CAPS = {
  auth: [
    'auth.user.create', 'auth.user.update', 'auth.grant', 'auth.grant.list',
    'log.org.read', 'log.org.update',
    'log.project.create', 'log.project.update', 'log.project.read',
    'log.key.list', 'log.key.create', 'log.key.toggle', 'log.key.delete',
  ],
  log: [
    'log.org.read', 'log.org.update',
    'log.project.create', 'log.project.update', 'log.project.read',
    'log.key.list', 'log.key.create', 'log.key.toggle', 'log.key.delete',
    'log.query', 'log.query.detail',
  ],
  appStore: ['module.appStore.write'],
  project: ['module.project.access'],
  image: ['module.image.access'],
  television: ['module.television.access'],
  config: ['module.config.access'],
  serverInfo: ['module.serverInfo.access'],
  LANSharing: ['module.LANSharing.access'],
  swagger: ['module.swagger.access'],
  dataMock: ['module.dataMock.access'],
  planeEditor: ['module.planeEditor.access'],
  imageCrypto: ['module.imageCrypto.access'],
  calc: ['module.calc.access'],
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
