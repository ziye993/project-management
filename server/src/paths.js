import path from 'path';
import { fileURLToPath } from 'url';

let rootDir = null;

export function setRootDir(dir) {
  rootDir = dir;
}

export function getRootDir() {
  if (!rootDir) {
    rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  }
  return rootDir;
}

export function getDataDir() {
  return path.join(getRootDir(), 'data');
}

export function getHtmlDir() {
  return path.join(getRootDir(), 'html');
}

export function getFilesDir() {
  return path.join(getDataDir(), 'files');
}
