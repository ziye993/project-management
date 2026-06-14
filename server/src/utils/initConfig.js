import fs from 'fs';
import path from 'path';
import {
  fileExists,
  getConfig,
  getProjectsData,
  readJSON,
  setProjectsData,
} from './jsonFile.js';

function parseScripts(projectPath, soltScript = []) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fileExists(pkgPath)) return [];
  const scriptConfig = readJSON(pkgPath);
  const scripts = scriptConfig?.scripts;
  if (!scripts) return [];
  return Object.keys(scripts).map(item => {
    const fIndex = soltScript.findIndex(s => item === s);
    return {
      label: item,
      value: item,
      command: scripts[item],
      sortIndex: fIndex > -1 ? fIndex : soltScript.length + 100,
    };
  });
}

function buildProjectEntry(projectPath, importType) {
  const label = path.basename(projectPath);
  return {
    label,
    value: label,
    path: projectPath,
    parentPath: path.dirname(projectPath),
    importType,
    scripts: parseScripts(projectPath, getConfig()?.soltScript || []),
  };
}

export function buildProjectListFromStore() {
  const store = getProjectsData(true);
  const list = store.projects.map(entry => ({
    ...entry,
    scripts: parseScripts(entry.path, store.soltScript || []),
  }));
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
