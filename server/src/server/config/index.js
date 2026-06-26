import app from '../../app.js';
import { getConfig, setConfig } from "../../utils/jsonFile.js";
import { getFilesDir } from '../../paths.js';
import { normalizeMockFieldDefaults } from '../mock/mockConfig.js';

app.post('/api/config/getConfig', (req, res) => {
  const config = getConfig(true);
  res.send({
    code: 0,
    success: true,
    msg: '',
    data: {
      ...config,
      filesRoot: getFilesDir(),
    },
  });
});

app.post('/api/config/setPicUploadPath', (req, res) => {
  const { uploadPath } = req.body;
  if (!uploadPath) {
    return res.status(400).send({ code: 1, success: false, data: null, msg: '路径不能为空' });
  }
  const config = getConfig(true) || {};
  config.picUploadPath = uploadPath;
  setConfig(config);
  res.send({ code: 0, success: true, data: null, msg: '' });
});

app.post('/api/config/setMovUploadPath', (req, res) => {
  const { uploadPath } = req.body;
  if (!uploadPath) {
    return res.status(400).send({ code: 1, success: false, data: null, msg: '路径不能为空' });
  }
  const config = getConfig(true) || {};
  config.movUploadPath = uploadPath;
  setConfig(config);
  res.send({ code: 0, success: true, data: null, msg: '' });
});

app.post('/api/config/setFileUploadPath', (req, res) => {
  const { uploadPath } = req.body;
  if (!uploadPath) {
    return res.status(400).send({ code: 1, success: false, data: null, msg: '路径不能为空' });
  }
  const config = getConfig(true) || {};
  config.fileUploadPath = uploadPath;
  setConfig(config);
  res.send({ code: 0, success: true, data: null, msg: '' });
});

app.post('/api/config/setPublicBaseUrl', (req, res) => {
  const { publicBaseUrl } = req.body;
  const config = getConfig(true) || {};
  config.publicBaseUrl = publicBaseUrl || '';
  setConfig(config);
  res.send({ code: 0, success: true, data: null, msg: '' });
});

app.post('/api/config/setCommandSortOrder', (req, res) => {
  const { commandSortOrder } = req.body;
  if (!Array.isArray(commandSortOrder)) {
    return res.status(400).send({ code: 1, success: false, data: null, msg: '排序列表格式无效' });
  }
  const cleaned = commandSortOrder
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  const config = getConfig(true) || {};
  config.commandSortOrder = cleaned;
  setConfig(config);
  res.send({ code: 0, success: true, data: { commandSortOrder: cleaned }, msg: '' });
});

app.post('/api/config/setMockFieldDefaults', (req, res) => {
  const { mockFieldDefaults } = req.body ?? {};
  if (mockFieldDefaults !== undefined && (typeof mockFieldDefaults !== 'object' || mockFieldDefaults === null)) {
    return res.status(400).send({ code: 1, success: false, data: null, msg: 'mockFieldDefaults 格式无效' });
  }
  const config = getConfig(true) || {};
  config.mockFieldDefaults = normalizeMockFieldDefaults(mockFieldDefaults ?? {});
  setConfig(config);
  res.send({ code: 0, success: true, data: { mockFieldDefaults: config.mockFieldDefaults }, msg: '' });
});
