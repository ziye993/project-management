import fs from 'fs';
import path from 'path';
import { getConfig, setConfig } from './utils/jsonFile.js';
import { getDataDir, getFilesDir } from './paths.js';

const SUB_DIRS = ['pic', 'mov', 'upload', 'share', 'chunks', 'appStore'];

export function getShareDir() {
  const config = getConfig(true);
  if (config.sharePath) return config.sharePath;
  return path.join(getDataDir(), 'share');
}

export function initDataStorage() {
  const dataDir = getDataDir();
  const filesDir = getFilesDir();
  const shareDir = path.join(dataDir, 'share');
  const appStoreDir = path.join(filesDir, 'appStore');

  for (const dir of [
    dataDir,
    filesDir,
    shareDir,
    path.join(dataDir, 'chunks'),
    ...SUB_DIRS.filter(d => d !== 'share' && d !== 'chunks').map(d => path.join(filesDir, d)),
    path.join(appStoreDir, 'covers'),
    path.join(appStoreDir, 'packages'),
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const config = getConfig(true);
  const updates = {};
  if (!config.picUploadPath) updates.picUploadPath = path.join(filesDir, 'pic');
  if (!config.movUploadPath) updates.movUploadPath = path.join(filesDir, 'mov');
  if (!config.fileUploadPath) updates.fileUploadPath = path.join(filesDir, 'upload');
  if (!config.sharePath) updates.sharePath = shareDir;
  if (!config.picRequestPath) updates.picRequestPath = '/static/pic';
  if (!config.movRequestPath) updates.movRequestPath = '/static/mov';
  if (!config.fileRequestPath) updates.fileRequestPath = '/static/file';
  if (!config.shareRequestPath) updates.shareRequestPath = '/static/share';
  if (!config.appStorePackagePath) updates.appStorePackagePath = appStoreDir;
  if (!config.appStoreRequestPath) updates.appStoreRequestPath = '/static/app-store';
  if (!config.appStore || typeof config.appStore !== 'object') {
    updates.appStore = {
      lockTtlMs: 40000,
      lockHeartbeatMs: 20000,
      maxPackageBytes: 2147483648,
      maxHistoryVersions: 10,
      maxMajorVersions: 2,
      allowedExts: [],
    };
  }

  if (Object.keys(updates).length) {
    setConfig({ ...config, ...updates });
  }
}
