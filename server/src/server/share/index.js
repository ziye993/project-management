import fs from 'fs';
import path from 'path';
import multer from 'multer';
import app from '../../app.js';
import { getShareDir } from '../../initDataStorage.js';
import { buildAccessLinksRelative } from '../../utils/accessLinks.js';
import { getConfig } from '../../utils/jsonFile.js';
import { fixFilenameEncoding } from '../../utils/filenameEncoding.js';
import { ok, fail } from '../../utils/httpResponse.js';

const CHAT_FOLDER = 'chat';

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
    const original = fixFilenameEncoding(file.originalname);
    const name = req.body?.source === 'chat' ? `${Date.now()}-${original}` : original;
    cb(null, name);
  },
});

const shareUpload = multer({ storage: shareStorage }).array('files');

app.post('/api/share/list', (req, res) => {
  try {
    const chatOnly = req.body?.chatOnly === true;
    const relativePath = chatOnly ? CHAT_FOLDER : (req.body?.relativePath || '');
    const dir = safeJoin(getShareDir(), relativePath);
    if (!fs.existsSync(dir)) {
      return ok(res, { items: [], currentPath: relativePath, chatOnly });
    }
    const config = getConfig();
    const prefix = config.shareRequestPath || '/static/share';
    let items = fs.readdirSync(dir, { withFileTypes: true }).map(entry => {
      const rel = path.join(relativePath, entry.name).replace(/\\/g, '/');
      const full = path.join(dir, entry.name);
      const stat = fs.statSync(full);
      const isChat = rel === CHAT_FOLDER || rel.startsWith(`${CHAT_FOLDER}/`);
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        relativePath: rel,
        size: entry.isDirectory() ? 0 : stat.size,
        modifiedAt: stat.mtimeMs,
        source: isChat ? 'chat' : 'normal',
        downloadLinks: entry.isDirectory() ? [] : buildAccessLinksRelative(prefix, rel),
      };
    }).sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    if (!chatOnly && !relativePath) {
      items = items.filter(item => item.relativePath !== CHAT_FOLDER);
    }

    ok(res, { items, currentPath: relativePath, chatOnly });
  } catch (e) {
    fail(res, 400, 1, e.message);
  }
});

app.post('/api/share/mkdir', (req, res) => {
  try {
    const { relativePath = '', name } = req.body;
    if (!name) return fail(res, 400, 1, '文件夹名不能为空');
    const dir = safeJoin(getShareDir(), path.join(relativePath, name));
    fs.mkdirSync(dir, { recursive: true });
    ok(res, null, '创建成功');
  } catch (e) {
    fail(res, 400, 1, e.message);
  }
});

app.post('/api/share/upload', (req, res) => {
  shareUpload(req, res, err => {
    if (err) return fail(res, 400, 1, err.message);
    const config = getConfig();
    const prefix = config.shareRequestPath || '/static/share';
    const relativePath = req.body?.relativePath || '';
    ok(res, (req.files || []).map(f => {
      const rel = path.join(relativePath, f.filename).replace(/\\/g, '/');
      return {
        name: f.filename,
        originalName: f.originalname,
        size: f.size,
        relativePath: rel,
        source: req.body?.source === 'chat' ? 'chat' : 'normal',
        downloadLinks: buildAccessLinksRelative(prefix, rel),
      };
    }), '上传成功');
  });
});

app.post('/api/share/delete', (req, res) => {
  try {
    const { relativePath } = req.body;
    if (!relativePath) return fail(res, 400, 1, '缺少路径');
    const target = safeJoin(getShareDir(), relativePath);
    if (!fs.existsSync(target)) return fail(res, 404, 2, '不存在');
    const stat = fs.statSync(target);
    if (stat.isDirectory()) fs.rmSync(target, { recursive: true, force: true });
    else fs.unlinkSync(target);
    ok(res, null, '已删除');
  } catch (e) {
    fail(res, 400, 1, e.message);
  }
});
