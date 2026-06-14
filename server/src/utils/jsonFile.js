import fs from 'fs';
import path from 'path';
import { getDataDir } from '../paths.js';

const CONFIG_FILE = 'config.json';
const PROJECTS_FILE = 'projects.json';
const COLORS_FILE = 'workspace-colors.json';

function resolveDataFile(name) {
  return path.join(getDataDir(), name);
}

function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readJSONFile(name, fallback = {}) {
  ensureDataDir();
  const filePath = resolveDataFile(name);
  if (!fs.existsSync(filePath)) return fallback;
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

export function writeJSONFile(name, content) {
  ensureDataDir();
  const filePath = resolveDataFile(name);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
}

export function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

let configCache = null;
let projectsCache = null;
let colorsCache = null;

export function getConfig(refresh) {
  if (!refresh && configCache) return configCache;
  configCache = readJSONFile(CONFIG_FILE, {});
  return configCache;
}

export function setConfig(newConfig) {
  const merged = { ...getConfig(true), ...newConfig };
  writeJSONFile(CONFIG_FILE, merged);
  configCache = merged;
  return merged;
}

export { configCache as config };

export function getProjectsData(refresh) {
  if (!refresh && projectsCache) return projectsCache;
  projectsCache = readJSONFile(PROJECTS_FILE, { projects: [], soltScript: [] });
  if (!projectsCache.projects) projectsCache.projects = [];
  if (!projectsCache.soltScript) projectsCache.soltScript = [];
  return projectsCache;
}

export function setProjectsData(data) {
  writeJSONFile(PROJECTS_FILE, data);
  projectsCache = data;
  return data;
}

export function getColorCache(refresh) {
  if (!refresh && colorsCache) return colorsCache;
  colorsCache = readJSONFile(COLORS_FILE, { lastRefreshedAt: null, groups: [] });
  if (!colorsCache.groups) colorsCache.groups = [];
  return colorsCache;
}

export function setColorCache(data) {
  writeJSONFile(COLORS_FILE, data);
  colorsCache = data;
  return data;
}

export function readJSON(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  const data = fs.readFileSync(resolved, 'utf-8');
  return JSON.parse(data);
}

export function getFolders(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter(name => fs.statSync(path.join(dirPath, name)).isDirectory());
}
