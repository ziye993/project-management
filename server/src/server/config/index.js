import app from '../../app.js';
import { getConfig, setConfig } from "../../utils/jsonFile.js";
import { getFilesDir } from '../../paths.js';
import { normalizeMockFieldDefaults } from '../mock/mockConfig.js';
import { normalizeModuleAccess } from '../../middleware/access.js';
import { normalizeCustomProjectCommands } from '../../utils/customCommands.js';
import { ok, fail } from '../../utils/httpResponse.js';

app.post('/api/config/getConfig', (req, res) => {
  const config = getConfig(true);
  ok(res, {
    ...config,
    filesRoot: getFilesDir(),
  });
});

app.post('/api/config/setPicUploadPath', (req, res) => {
  const { uploadPath } = req.body;
  if (!uploadPath) {
    return fail(res, 400, 1, '路径不能为空');
  }
  const config = getConfig(true) || {};
  config.picUploadPath = uploadPath;
  setConfig(config);
  ok(res, null);
});

app.post('/api/config/setMovUploadPath', (req, res) => {
  const { uploadPath } = req.body;
  if (!uploadPath) {
    return fail(res, 400, 1, '路径不能为空');
  }
  const config = getConfig(true) || {};
  config.movUploadPath = uploadPath;
  setConfig(config);
  ok(res, null);
});

app.post('/api/config/setFileUploadPath', (req, res) => {
  const { uploadPath } = req.body;
  if (!uploadPath) {
    return fail(res, 400, 1, '路径不能为空');
  }
  const config = getConfig(true) || {};
  config.fileUploadPath = uploadPath;
  setConfig(config);
  ok(res, null);
});

app.post('/api/config/setPublicBaseUrl', (req, res) => {
  const { publicBaseUrl } = req.body;
  const config = getConfig(true) || {};
  config.publicBaseUrl = publicBaseUrl || '';
  setConfig(config);
  ok(res, null);
});

app.post('/api/config/setCommandSortOrder', (req, res) => {
  const { commandSortOrder } = req.body;
  if (!Array.isArray(commandSortOrder)) {
    return fail(res, 400, 1, '排序列表格式无效');
  }
  const cleaned = commandSortOrder
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  const config = getConfig(true) || {};
  config.commandSortOrder = cleaned;
  setConfig(config);
  ok(res, { commandSortOrder: cleaned });
});

app.post('/api/config/setMockFieldDefaults', (req, res) => {
  const { mockFieldDefaults } = req.body ?? {};
  if (mockFieldDefaults !== undefined && (typeof mockFieldDefaults !== 'object' || mockFieldDefaults === null)) {
    return fail(res, 400, 1, 'mockFieldDefaults 格式无效');
  }
  const config = getConfig(true) || {};
  config.mockFieldDefaults = normalizeMockFieldDefaults(mockFieldDefaults ?? {});
  setConfig(config);
  ok(res, { mockFieldDefaults: config.mockFieldDefaults });
});

app.post('/api/config/setModuleAccess', (req, res) => {
  const { moduleAccess } = req.body ?? {};
  if (moduleAccess !== undefined && (typeof moduleAccess !== 'object' || moduleAccess === null)) {
    return fail(res, 400, 1, 'moduleAccess 格式无效');
  }
  const config = getConfig(true) || {};
  const normalized = normalizeModuleAccess(moduleAccess);
  const hasRules = normalized.requireLogin.length > 0 || normalized.hidden.length > 0;
  if (hasRules) {
    config.moduleAccess = normalized;
  } else {
    delete config.moduleAccess;
  }
  setConfig(config);
  ok(res, { moduleAccess: normalized });
});

app.post('/api/config/setCustomProjectCommands', (req, res) => {
  const { customProjectCommands } = req.body ?? {};
  if (customProjectCommands !== undefined && !Array.isArray(customProjectCommands)) {
    return fail(res, 400, 1, 'customProjectCommands 格式无效');
  }
  const config = getConfig(true) || {};
  config.customProjectCommands = normalizeCustomProjectCommands(customProjectCommands ?? []);
  setConfig(config);
  ok(res, { customProjectCommands: config.customProjectCommands });
});
