import fs from 'fs';
import path from 'path';
import multer from 'multer';
import app from '../../app.js';
import { getShareDir } from '../../initDataStorage.js';
import { buildAccessLinks, buildAccessLinksRelative } from '../../utils/accessLinks.js';
import { getConfig } from '../../utils/jsonFile.js';

function safeJoin(base, relative) {
  const target = path.normalize(path.join(base, relative || ''));
  if (!target.startsWith(path.normalize(base))) {
    throw new Error('非法路径');
  }
  return target;
}

const shareStorage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const dir = safeJoin(getShareDir(), req.body.relativePath || '');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename(req, file, cb) {
    cb(null, file.originalname);
  },
});

const shareUpload = multer({ storage: shareStorage }).array('files');

app.post('/api/share/list', (req, res) => {
  try {
    const { relativePath = '' } = req.body;
    const dir = safeJoin(getShareDir(), relativePath);
    if (!fs.existsSync(dir)) {
      return res.json({ success: true, code: 0, data: { items: [], currentPath: relativePath }, msg: '' });
    }
    const config = getConfig();
    const prefix = config.shareRequestPath || '/static/share';
    const items = fs.readdirSync(dir, { withFileTypes: true }).map(entry => {
      const rel = path.join(relativePath, entry.name).replace(/\\/g, '/');
      const full = path.join(dir, entry.name);
      const stat = fs.statSync(full);
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        relativePath: rel,
        size: entry.isDirectory() ? 0 : stat.size,
        modifiedAt: stat.mtimeMs,
        downloadLinks: entry.isDirectory() ? [] : buildAccessLinksRelative(prefix, rel),
      };
    }).sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, code: 0, data: { items, currentPath: relativePath }, msg: '' });
  } catch (e) {
    res.status(400).json({ success: false, code: 1, msg: e.message, data: null });
  }
});

app.post('/api/share/mkdir', (req, res) => {
  try {
    const { relativePath = '', name } = req.body;
    if (!name) return res.status(400).json({ success: false, code: 1, msg: '文件夹名不能为空' });
    const dir = safeJoin(getShareDir(), path.join(relativePath, name));
    fs.mkdirSync(dir, { recursive: true });
    res.json({ success: true, code: 0, data: null, msg: '创建成功' });
  } catch (e) {
    res.status(400).json({ success: false, code: 1, msg: e.message });
  }
});

app.post('/api/share/upload', (req, res) => {
  shareUpload(req, res, err => {
    if (err) return res.status(400).json({ success: false, msg: err.message });
    res.json({
      success: true, code: 0,
      data: (req.files || []).map(f => ({ name: f.originalname, size: f.size })),
      msg: '上传成功',
    });
  });
});

app.post('/api/share/delete', (req, res) => {
  try {
    const { relativePath } = req.body;
    if (!relativePath) return res.status(400).json({ success: false, code: 1, msg: '缺少路径' });
    const target = safeJoin(getShareDir(), relativePath);
    if (!fs.existsSync(target)) return res.status(404).json({ success: false, code: 2, msg: '不存在' });
    const stat = fs.statSync(target);
    if (stat.isDirectory()) fs.rmSync(target, { recursive: true, force: true });
    else fs.unlinkSync(target);
    res.json({ success: true, code: 0, msg: '已删除' });
  } catch (e) {
    res.status(400).json({ success: false, code: 1, msg: e.message });
  }
});
