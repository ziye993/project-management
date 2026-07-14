import app from '../../app.js';
import { ok, fail } from '../../utils/httpResponse.js';
import {
  deleteRecord,
  getRecord,
  isValidMonth,
  listMonths,
  saveRecord,
} from './storage.js';

app.post('/api/calc/utility/list', (_req, res) => {
  try {
    ok(res, { months: listMonths() });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '读取月份列表失败');
  }
});

app.post('/api/calc/utility/get', (req, res) => {
  try {
    const month = req.body?.month;
    if (!isValidMonth(month)) {
      return fail(res, 400, 1, '月份格式应为 YYYY-MM');
    }
    ok(res, { record: getRecord(month) });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '读取月份数据失败');
  }
});

app.post('/api/calc/utility/save', (req, res) => {
  try {
    const record = saveRecord(req.body ?? {});
    ok(res, { record }, '已保存');
  } catch (err) {
    fail(res, 400, 1, err instanceof Error ? err.message : '保存失败');
  }
});

app.post('/api/calc/utility/delete', (req, res) => {
  try {
    const month = req.body?.month;
    if (!isValidMonth(month)) {
      return fail(res, 400, 1, '月份格式应为 YYYY-MM');
    }
    const removed = deleteRecord(month);
    if (!removed) {
      return fail(res, 404, 1, '该月份暂无数据');
    }
    ok(res, { month }, '已删除');
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '删除失败');
  }
});
