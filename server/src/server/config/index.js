import app from '../../app.js';
import { getConfig, setConfig } from "../../utils/jsonFile.js";
import { getFilesDir } from '../../paths.js';

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
