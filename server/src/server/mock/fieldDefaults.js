/** 系统配置 mockFieldDefaults → 按字段路径解析默认值（个体 fieldRules 优先）。 */

function isConfigured(value) {
  return value !== undefined && value !== null && value !== '';
}

function coerceNumber(value, schema) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return schema?.type === 'integer' ? Math.trunc(n) : n;
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

const PAGINATION_CONFIG = {
  pageNo: ['pageNo', 'pageNum', 'current', 'page'],
  pageSize: ['pageSize', 'size'],
  total: ['total'],
};

function getPathLeaf(path) {
  const parts = path.split('.');
  return parts[parts.length - 1] ?? path;
}

function resolvePaginationDefault(path, defaults, schema) {
  const pagination = defaults?.pagination ?? defaults?.result;
  if (!pagination || typeof pagination !== 'object') return undefined;

  const leaf = getPathLeaf(path);
  for (const [configKey, aliases] of Object.entries(PAGINATION_CONFIG)) {
    if (!aliases.includes(leaf)) continue;

    let value = pagination[configKey];
    if (!isConfigured(value) && configKey === 'pageNo') value = pagination.current;
    if (!isConfigured(value) && configKey === 'pageSize') value = pagination.size;
    if (isConfigured(value)) return coerceNumber(value, schema);
  }

  return undefined;
}

/**
 * @param {string} path 字段路径，如 code、msg、data.pageNo
 * @param {object} defaults config.mockFieldDefaults
 * @param {object} schema 当前字段 schema
 * @returns {unknown|undefined} 有配置则返回值，否则 undefined
 */
export function resolveGlobalFieldDefault(path, defaults, schema) {
  if (!defaults || !path || path.includes('[]')) return undefined;

  if (path === 'code' && isConfigured(defaults.code)) {
    return coerceNumber(defaults.code, schema);
  }

  if (path === 'success' && isConfigured(defaults.success)) {
    return coerceBoolean(defaults.success);
  }

  if ((path === 'msg' || path === 'message') && isConfigured(defaults.message)) {
    return String(defaults.message);
  }

  const paginated = resolvePaginationDefault(path, defaults, schema);
  if (paginated !== undefined) return paginated;

  return undefined;
}

export const MOCK_DEFAULT_FIELD_PATHS = [
  'code',
  'success',
  'msg',
  'message',
  'pageNo',
  'pageSize',
  'total',
  'data.pageNo',
  'data.pageSize',
  'data.total',
  'result.pageNo',
  'result.pageSize',
  'result.total',
];
