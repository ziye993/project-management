import path from 'path';
import app from '../../app.js';
import { getConfig } from '../../utils/jsonFile.js';
import { getShareDir } from '../../initDataStorage.js';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
};

function guessMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function resolveRelativePath(reqUrl, requestPrefix) {
  const raw = reqUrl.slice(requestPrefix.length).replace(/^\/+/, '');
  const parts = raw.split('/').filter(Boolean).map(seg => decodeURIComponent(seg));
  return parts;
}

function sendStaticFile(req, res, next, requestPrefix, uploadPath) {
  if (!req.url.startsWith(requestPrefix) || !uploadPath) return next();

  try {
    const parts = resolveRelativePath(req.url, requestPrefix);
    const filePath = path.normalize(path.join(uploadPath, ...parts));
    const base = path.normalize(uploadPath);

    if (!filePath.startsWith(base)) {
      return res.status(403).end();
    }

    res.setHeader('Content-Type', guessMime(filePath));
    res.sendFile(filePath, { dotfiles: 'allow' }, err => {
      if (err) next();
    });
  } catch {
    next();
  }
}

app.use((req, res, next) => {
  const config = getConfig();
  if (config?.picRequestPath && req.url.startsWith(config.picRequestPath)) {
    return sendStaticFile(req, res, next, config.picRequestPath, config.picUploadPath);
  }
  if (config?.movRequestPath && req.url.startsWith(config.movRequestPath)) {
    return sendStaticFile(req, res, next, config.movRequestPath, config.movUploadPath);
  }
  if (config?.fileRequestPath && req.url.startsWith(config.fileRequestPath)) {
    return sendStaticFile(req, res, next, config.fileRequestPath, config.fileUploadPath);
  }
  const sharePrefix = config?.shareRequestPath || '/static/share';
  if (req.url.startsWith(sharePrefix)) {
    return sendStaticFile(req, res, next, sharePrefix, getShareDir());
  }
  if (config?.appStoreRequestPath && config?.appStorePackagePath
    && req.url.startsWith(config.appStoreRequestPath)) {
    return sendStaticFile(req, res, next, config.appStoreRequestPath, config.appStorePackagePath);
  }
  next();
});
