import fs from 'fs';
import path from 'path';
import {
  fileExists,
  getConfig,
  getProjectsData,
  readJSON,
  setProjectsData,
} from './jsonFile.js';

const DEFAULT_COMMAND_SORT = ['dev', 'start', 'build', 'server', 'preview'];

export function getCommandSortOrder() {
  const config = getConfig(true);
  if (config.commandSortOrder?.length) return config.commandSortOrder;
  const store = getProjectsData(true);
  if (store.soltScript?.length) return store.soltScript;
  return DEFAULT_COMMAND_SORT;
}

function parseScripts(projectPath, sortOrder = []) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fileExists(pkgPath)) return [];
  const scriptConfig = readJSON(pkgPath);
  const scripts = scriptConfig?.scripts;
  if (!scripts) return [];
  return Object.keys(scripts).map(item => {
    const fIndex = sortOrder.findIndex(s => item === s);
    return {
      label: item,
      value: item,
      command: scripts[item],
      sortIndex: fIndex > -1 ? fIndex : sortOrder.length + 100,
      isPinned: fIndex > -1,
    };
  });
}

function buildProjectEntry(projectPath, importType) {
  const normalizedPath = path.normalize(projectPath);
  const label = path.basename(normalizedPath);
  return {
    label,
    value: label,
    path: normalizedPath,
    parentPath: path.dirname(normalizedPath),
    importType,
    scripts: parseScripts(projectPath, getCommandSortOrder()),
  };
}

export function buildProjectListFromStore() {
  const store = getProjectsData(true);
  const list = store.projects.map(entry => {
    const normalizedPath = path.normalize(entry.path);
    return {
      ...entry,
      path: normalizedPath,
      parentPath: path.dirname(normalizedPath),
      scripts: parseScripts(normalizedPath, getCommandSortOrder()),
    };
  });
  return list;
}

export function scanWorkspaceFolder(folderPath) {
  const entries = [];
  const children = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(folderPath, d.name));

  for (const childPath of children) {
    if (fileExists(path.join(childPath, 'package.json'))) {
      entries.push(buildProjectEntry(childPath, 'workspace'));
    }
  }
  return entries;
}

export function addProjects(newProjects) {
  const store = getProjectsData(true);
  const existingPaths = new Set(store.projects.map(p => p.path));
  const toAdd = newProjects.filter(p => !existingPaths.has(p.path));
  store.projects.push(...toAdd.map(({ scripts, ...rest }) => rest));
  setProjectsData(store);
  return buildProjectListFromStore();
}

export function removeProjectByPath(projectPath) {
  const store = getProjectsData(true);
  store.projects = store.projects.filter(p => p.path !== projectPath);
  setProjectsData(store);
  return buildProjectListFromStore();
}

export function buildSingleProject(folderPath) {
  return buildProjectEntry(folderPath, 'project');
}

export default function getProjectList() {
  return buildProjectListFromStore();
}
