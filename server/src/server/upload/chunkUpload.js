import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import app from '../../app.js';
import { getConfig } from '../../utils/jsonFile.js';
import { registerMedia } from '../../utils/mediaRegistry.js';
import { fixFilenameEncoding } from '../../utils/filenameEncoding.js';
import { getDataDir } from '../../paths.js';

function getChunksBase() {
  return path.join(getDataDir(), 'chunks');
}

function getUploadDir(type) {
  const config = getConfig();
  if (type === 'mov') return config.movUploadPath;
  if (type === 'pic') return config.picUploadPath;
  return config.fileUploadPath;
}

const memUpload = multer({ storage: multer.memoryStorage() }).single('chunk');

app.post('/api/upload/chunkInit', (req, res) => {
  const { filename, totalChunks, type = 'mov' } = req.body;
  if (!filename || !totalChunks) {
    return res.status(400).json({ success: false, code: 1, msg: '缺少参数' });
  }
  const uploadId = randomUUID();
  const dir = path.join(getChunksBase(), uploadId);
  fs.mkdirSync(dir, { recursive: true });
  const safeName = fixFilenameEncoding(filename);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
    filename: safeName, totalChunks: Number(totalChunks), type, received: [],
  }));
  res.json({ success: true, code: 0, data: { uploadId }, msg: '' });
});

app.post('/api/upload/chunk', (req, res) => {
  memUpload(req, res, err => {
    if (err) return res.status(400).json({ success: false, msg: err.message });
    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ success: false, code: 1, msg: '缺少参数' });
    }
    const dir = path.join(getChunksBase(), uploadId);
    if (!fs.existsSync(dir)) {
      return res.status(400).json({ success: false, code: 1, msg: '上传会话不存在' });
    }
    const chunkPath = path.join(dir, `part-${chunkIndex}`);
    fs.writeFileSync(chunkPath, req.file.buffer);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf-8'));
    const idx = Number(chunkIndex);
    if (!meta.received.includes(idx)) meta.received.push(idx);
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
    res.json({
      success: true, code: 0,
      data: { received: meta.received.length, total: meta.totalChunks },
      msg: '',
    });
  });
});

app.post('/api/upload/chunkMerge', async (req, res) => {
  const { uploadId } = req.body;
  const dir = path.join(getChunksBase(), uploadId);
  if (!fs.existsSync(dir)) {
    return res.status(400).json({ success: false, code: 1, msg: '上传会话不存在' });
  }

  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf-8'));
    const uploadDir = getUploadDir(meta.type);
    if (!uploadDir) throw new Error('未配置存储路径');

    const storedName = `${Date.now()}-${meta.filename}`;
    const outPath = path.join(uploadDir, storedName);

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(outPath);
      ws.on('error', reject);
      ws.on('finish', resolve);
      for (let i = 0; i < meta.totalChunks; i++) {
        const partPath = path.join(dir, `part-${i}`);
        if (!fs.existsSync(partPath)) {
          ws.destroy();
          return reject(new Error(`缺少分片 ${i}`));
        }
        ws.write(fs.readFileSync(partPath));
      }
      ws.end();
    });

    const stat = fs.statSync(outPath);
    const registered = registerMedia(meta.type, [{
      filename: storedName,
      originalname: meta.filename,
      size: stat.size,
    }]);

    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ success: true, code: 0, data: registered[registered.length - 1], msg: '合并成功' });
  } catch (e) {
    res.status(500).json({ success: false, code: 2, msg: e.message });
  }
});
