import fs from 'fs';
import path from 'path';
import app from '../../app.js';
import { findAppBySlug } from './storage.js';
import { resolvePackageAbsolutePath } from './packageStore.js';

function contentDisposition(filename) {
  const fallback = String(filename || 'download')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(String(filename || 'download')).replace(/['()]/g, escape);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Public download: GET /appStore/:ownerSlug/:appSlug
 * Registered at module load (before SPA fallback in bootstrap).
 */
app.get('/appStore/:ownerSlug/:appSlug', (req, res) => {
  try {
    const { ownerSlug, appSlug } = req.params;
    const storeApp = findAppBySlug(ownerSlug, appSlug);
    if (!storeApp || storeApp.status !== 'active') {
      return res.status(404).send('Not Found');
    }

    const versionKey = storeApp.latestVersion;
    if (!versionKey) {
      return res.status(404).send('Not Found');
    }

    const ver = storeApp.versions?.[versionKey];
    if (!ver || ver.status !== 'published' || !ver.file?.relativePath) {
      return res.status(404).send('Not Found');
    }

    let abs;
    try {
      abs = resolvePackageAbsolutePath(ver.file.relativePath);
    } catch {
      return res.status(404).send('Not Found');
    }

    if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return res.status(404).send('Not Found');
    }

    // resolvePackageAbsolutePath already asserts under package root
    const mime = ver.file.mime || 'application/octet-stream';
    const originalName = ver.file.originalName || path.basename(abs);

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', contentDisposition(originalName));
    res.setHeader('Content-Length', fs.statSync(abs).size);

    const stream = fs.createReadStream(abs);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).end();
      else res.end();
    });
    stream.pipe(res);
  } catch {
    if (!res.headersSent) res.status(404).send('Not Found');
  }
});

export function registerAppStoreDownload() {
  // route registered on import
}
