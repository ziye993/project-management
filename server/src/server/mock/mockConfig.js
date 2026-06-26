import { getConfig } from '../../utils/jsonFile.js';

export function getMockGlobalDefaults() {
  return getConfig(true)?.mockFieldDefaults ?? null;
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function normalizeMockFieldDefaults(input = {}) {
  const result = {};

  const code = parseOptionalNumber(input.code);
  if (code !== undefined) result.code = code;

  const success = parseOptionalBoolean(input.success);
  if (success !== undefined) result.success = success;

  if (input.message !== undefined && input.message !== null && String(input.message).trim() !== '') {
    result.message = String(input.message);
  }

  const resultFields = {};
  const src = input.result && typeof input.result === 'object' ? input.result : {};
  for (const key of ['size', 'total', 'current', 'pages']) {
    const n = parseOptionalNumber(src[key]);
    if (n !== undefined) resultFields[key] = n;
  }
  if (Object.keys(resultFields).length) {
    result.result = resultFields;
  }

  return result;
}
