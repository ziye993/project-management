import path from 'path';
import { getProjectsData, getColorCache, setColorCache } from './jsonFile.js';

const LIGHT_COLORS = [
  '#FFFDE7',
  '#E8F5E9',
  '#E3F2FD',
  '#FFF3E0',
  '#F3E5F5',
  '#FCE4EC',
  '#E0F2F1',
  '#EFEBE9',
  '#F9FBE7',
  '#FBE9E7',
];

export function computeColorGroups() {
  const store = getProjectsData(true);
  const parentMap = new Map();

  for (const project of store.projects) {
    const parentPath = project.parentPath || path.dirname(project.path);
    if (!parentMap.has(parentPath)) {
      parentMap.set(parentPath, []);
    }
    parentMap.get(parentPath).push({
      label: project.label,
      value: project.value,
      path: project.path,
    });
  }

  const groups = [];
  let colorIndex = 0;

  for (const [parentPath, projects] of parentMap.entries()) {
    groups.push({
      parentPath,
      color: LIGHT_COLORS[colorIndex % LIGHT_COLORS.length],
      projects,
    });
    colorIndex += 1;
  }

  const cache = {
    lastRefreshedAt: new Date().toISOString(),
    groups,
  };

  setColorCache(cache);
  return cache;
}

export function getProjectColorMap() {
  const cache = getColorCache();
  const map = {};
  for (const group of cache.groups || []) {
    for (const project of group.projects || []) {
      map[project.path] = {
        color: group.color,
        parentPath: group.parentPath,
      };
    }
  }
  return map;
}
