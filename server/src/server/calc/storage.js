import { readJSONFile, writeJSONFile } from '../../utils/jsonFile.js';

const STORE_FILE = 'calc-utility.json';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(month) {
  return typeof month === 'string' && MONTH_RE.test(month);
}

function emptyStore() {
  return { records: {} };
}

export function readStore() {
  const data = readJSONFile(STORE_FILE, emptyStore());
  if (!data.records || typeof data.records !== 'object') {
    data.records = {};
  }
  return data;
}

export function writeStore(data) {
  writeJSONFile(STORE_FILE, data);
  return data;
}

export function listMonths() {
  const { records } = readStore();
  return Object.keys(records)
    .filter(isValidMonth)
    .sort((a, b) => b.localeCompare(a))
    .map(month => {
      const r = records[month] || {};
      return {
        month,
        updatedAt: r.updatedAt || 0,
        householdCount: Array.isArray(r.households) ? r.households.length : 0,
        totalBill: Number(r.totalBill) || 0,
        waterTotalBill: r.waterResult?.totalBill ?? null,
        elecTotalBill: r.elecResult?.totalBill ?? (Number(r.totalBill) || 0),
      };
    });
}

export function getRecord(month) {
  if (!isValidMonth(month)) return null;
  const { records } = readStore();
  return records[month] || null;
}

export function saveRecord(payload) {
  const month = payload?.month;
  if (!isValidMonth(month)) {
    throw new Error('月份格式应为 YYYY-MM');
  }

  const store = readStore();
  const record = {
    month,
    totalKwh: Number(payload.totalKwh) || 0,
    totalBill: Number(payload.totalBill) || 0,
    households: Array.isArray(payload.households) ? payload.households : [],
    elecResult: payload.elecResult ?? null,
    waterResult: payload.waterResult ?? null,
    updatedAt: Date.now(),
  };
  store.records[month] = record;
  writeStore(store);
  return record;
}

export function deleteRecord(month) {
  if (!isValidMonth(month)) {
    throw new Error('月份格式应为 YYYY-MM');
  }
  const store = readStore();
  if (!store.records[month]) return false;
  delete store.records[month];
  writeStore(store);
  return true;
}
