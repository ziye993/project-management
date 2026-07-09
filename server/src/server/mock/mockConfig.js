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

function parsePaginationFields(src = {}) {
  const pagination = {};

  const pageNo = parseOptionalNumber(src.pageNo ?? src.current);
  if (pageNo !== undefined) pagination.pageNo = pageNo;

  const pageSize = parseOptionalNumber(src.pageSize ?? src.size);
  if (pageSize !== undefined) pagination.pageSize = pageSize;

  const total = parseOptionalNumber(src.total);
  if (total !== undefined) pagination.total = total;

  return pagination;
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

  const paginationSrc =
    input.pagination && typeof input.pagination === 'object'
      ? input.pagination
      : input.result && typeof input.result === 'object'
        ? input.result
        : {};

  const pagination = parsePaginationFields(paginationSrc);
  if (Object.keys(pagination).length) {
    result.pagination = pagination;
  }

  return result;
}
