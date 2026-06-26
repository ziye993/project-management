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

const RESULT_KEYS = ['size', 'total', 'current', 'pages'];

/**
 * @param {string} path 字段路径，如 code、msg、result.size
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

  const resultDefaults = defaults.result;
  if (resultDefaults && typeof resultDefaults === 'object') {
    for (const key of RESULT_KEYS) {
      if (path === `result.${key}` && isConfigured(resultDefaults[key])) {
        return coerceNumber(resultDefaults[key], schema);
      }
    }
  }

  return undefined;
}

export const MOCK_DEFAULT_FIELD_PATHS = [
  'code',
  'success',
  'msg',
  'message',
  'result.size',
  'result.total',
  'result.current',
  'result.pages',
];
