import fs from 'fs';
import path from 'path';
import { getConfig } from '../../utils/jsonFile.js';
import { getPackageRoot } from './storage.js';

function assertNoDotDot(parts) {
  for (const p of parts) {
    if (p === '..' || p.includes('\0')) {
      throw new Error('非法路径');
    }
  }
}

export function resolvePackageRoot() {
  const root = getPackageRoot();
  if (!root) throw new Error('未配置 appStorePackagePath');
  return path.normalize(root);
}

export function ensureDirs() {
  const root = resolvePackageRoot();
  for (const dir of [
    root,
    path.join(root, 'covers'),
    path.join(root, 'packages'),
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  return root;
}

function assertUnderRoot(filePath, root) {
  const normalized = path.normalize(filePath);
  const base = path.normalize(root);
  if (normalized !== base && !normalized.startsWith(base + path.sep)) {
    throw new Error('路径越界');
  }
  return normalized;
}

/**
 * Resolve absolute path for a temp upload under fileUploadPath.
 * @param {{ storedName?: string, relativePath?: string }} tempFile
 */
export function resolveTempFilePath(tempFile) {
  const config = getConfig() || {};
  const uploadRoot = config.fileUploadPath;
  if (!uploadRoot) throw new Error('未配置 fileUploadPath');

  const relative = tempFile?.relativePath || tempFile?.storedName;
  if (!relative || typeof relative !== 'string') {
    throw new Error('缺少临时文件路径');
  }

  const parts = relative.split(/[/\\]/).filter(Boolean);
  assertNoDotDot(parts);
  const abs = path.normalize(path.join(uploadRoot, ...parts));
  assertUnderRoot(abs, uploadRoot);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new Error('临时文件不存在');
  }
  return abs;
}

/**
 * Move temp upload into packages/{appId}/{version}/{storedName}.
 * @returns {{ originalName, storedName, relativePath, size, mime }}
 */
export function moveTempToPackage(appId, version, tempFile) {
  if (!appId || !version) throw new Error('缺少 appId 或 version');
  assertNoDotDot([String(appId), String(version)]);

  const root = ensureDirs();
  const src = resolveTempFilePath(tempFile);
  const originalName = tempFile.originalName || path.basename(src);
  const storedName = tempFile.storedName || path.basename(src);
  assertNoDotDot([storedName]);

  const destDir = path.join(root, 'packages', String(appId), String(version));
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, storedName);
  assertUnderRoot(dest, root);

  fs.renameSync(src, dest);
  const size = Number(tempFile.size) || fs.statSync(dest).size;
  const relativePath = path.posix.join('packages', String(appId), String(version), storedName);

  return {
    originalName,
    storedName,
    relativePath,
    size,
    mime: tempFile.mime || 'application/octet-stream',
  };
}

export function deletePackageFile(app, version) {
  if (!app || !version) return false;
  const ver = app.versions?.[version];
  const relativePath = ver?.file?.relativePath;
  if (!relativePath) {
    // best-effort remove version dir
    try {
      const root = resolvePackageRoot();
      const dir = path.join(root, 'packages', String(app.id), String(version));
      assertUnderRoot(dir, root);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
    return false;
  }

  try {
    const root = resolvePackageRoot();
    const parts = String(relativePath).split(/[/\\]/).filter(Boolean);
    assertNoDotDot(parts);
    const abs = path.normalize(path.join(root, ...parts));
    assertUnderRoot(abs, root);
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }
    const dir = path.dirname(abs);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
    return true;
  } catch {
    return false;
  }
}

export function resolvePackageAbsolutePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const root = resolvePackageRoot();
  const parts = relativePath.split(/[/\\]/).filter(Boolean);
  assertNoDotDot(parts);
  const abs = path.normalize(path.join(root, ...parts));
  assertUnderRoot(abs, root);
  return abs;
}

export function resolveCoverPath(appId, fileName) {
  if (!appId || !fileName) throw new Error('缺少封面参数');
  assertNoDotDot([String(appId), String(fileName)]);
  const root = ensureDirs();
  const abs = path.join(root, 'covers', String(appId), String(fileName));
  assertUnderRoot(abs, root);
  return abs;
}

export function ensureCoverDir(appId) {
  assertNoDotDot([String(appId)]);
  const root = ensureDirs();
  const dir = path.join(root, 'covers', String(appId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
