import fs from 'fs';
import path from 'path';
import { getDataDir } from '../paths.js';
import { fixFilenameEncoding, fixStoredFilename } from './filenameEncoding.js';

const REGISTRY_FILE = 'media-registry.json';

function registryPath() {
  return path.join(getDataDir(), REGISTRY_FILE);
}

function readRegistry() {
  const file = registryPath();
  if (!fs.existsSync(file)) {
    return { pic: [], mov: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeRegistry(data) {
  fs.writeFileSync(registryPath(), JSON.stringify(data, null, 2), 'utf-8');
}

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'heif', 'tiff']);

export function isImageFile(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return IMAGE_EXT.has(ext || '');
}

export function parseStoredName(storedName) {
  const fixed = fixStoredFilename(storedName);
  const match = fixed.match(/^(\d+)-(.+)$/);
  if (match) {
    return { uploadedAt: Number(match[1]), displayName: match[2], storedName: fixed };
  }
  return { uploadedAt: null, displayName: fixed, storedName: fixed };
}

function renameIfGarbled(uploadDir, storedName) {
  const fixed = fixStoredFilename(storedName);
  if (fixed === storedName) return storedName;

  const oldPath = path.join(uploadDir, storedName);
  const newPath = path.join(uploadDir, fixed);
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    fs.renameSync(oldPath, newPath);
  }
  return fs.existsSync(newPath) ? fixed : storedName;
}

export function registerMedia(type, files) {
  const registry = readRegistry();
  if (!registry[type]) registry[type] = [];
  const existing = new Set(registry[type].map(f => f.storedName));

  for (const file of files) {
    let storedName = file.filename || file.storedName;
    storedName = fixStoredFilename(storedName);
    if (!storedName || existing.has(storedName)) continue;

    const originalName = fixFilenameEncoding(file.originalname) || parseStoredName(storedName).displayName;
    const { displayName, uploadedAt } = parseStoredName(storedName);

    registry[type].push({
      storedName,
      originalName,
      displayName,
      size: file.size || 0,
      uploadedAt: uploadedAt || Date.now(),
      source: file.source || 'normal',
    });
    existing.add(storedName);
  }

  writeRegistry(registry);
  return registry[type];
}

export function syncMediaFromDisk(type, uploadDir) {
  if (!uploadDir || !fs.existsSync(uploadDir)) return [];
  const registry = readRegistry();
  if (!registry[type]) registry[type] = [];
  const filterFn = type === 'pic' ? isImageFile : () => true;

  const diskFiles = fs.readdirSync(uploadDir).filter(name => {
    const full = path.join(uploadDir, name);
    return fs.statSync(full).isFile() && filterFn(name);
  });

  const map = new Map(registry[type].map(f => [f.storedName, f]));

  for (const rawName of diskFiles) {
    const storedName = renameIfGarbled(uploadDir, rawName);
    const { displayName, uploadedAt } = parseStoredName(storedName);
    const stat = fs.statSync(path.join(uploadDir, storedName));

    if (map.has(rawName) && rawName !== storedName) {
      const old = map.get(rawName);
      map.delete(rawName);
      registry[type] = registry[type].filter(f => f.storedName !== rawName);
      map.set(storedName, { ...old, storedName, displayName, originalName: displayName });
    }

    if (!map.has(storedName)) {
      const entry = {
        storedName,
        originalName: displayName,
        displayName,
        size: stat.size,
        uploadedAt: uploadedAt || stat.mtimeMs,
      };
      registry[type].push(entry);
      map.set(storedName, entry);
    } else {
      const entry = map.get(storedName);
      entry.displayName = displayName;
      entry.originalName = displayName;
      entry.size = stat.size;
    }
  }

  registry[type] = registry[type]
    .filter(f => fs.existsSync(path.join(uploadDir, f.storedName)))
    .map(f => {
      const fixed = fixStoredFilename(f.storedName);
      const parsed = parseStoredName(fixed);
      return { ...f, storedName: fixed, displayName: parsed.displayName, originalName: parsed.displayName };
    });

  writeRegistry(registry);
  return registry[type];
}

export function getMediaList(type, uploadDir, options = {}) {
  const { source } = options;
  let list = syncMediaFromDisk(type, uploadDir);
  if (source === 'chat') {
    list = list.filter(item => item.source === 'chat');
  } else if (source === 'normal') {
    list = list.filter(item => item.source !== 'chat');
  }
  return list.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
}

export function deleteMedia(type, storedName, uploadDir) {
  const registry = readRegistry();
  if (!registry[type]) registry[type] = [];

  const candidates = [storedName, fixStoredFilename(storedName)];
  let deleted = false;

  for (const name of candidates) {
    const filePath = path.join(uploadDir, name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
  }

  registry[type] = registry[type].filter(f =>
    !candidates.includes(f.storedName) && !candidates.includes(fixStoredFilename(f.storedName))
  );
  writeRegistry(registry);

  return deleted;
}
