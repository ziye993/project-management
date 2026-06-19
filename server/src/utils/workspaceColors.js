import path from 'path';
import { getProjectsData, getColorCache, setColorCache } from './jsonFile.js';

const GROUP_COLORS = [
  '#F4D03F',
  '#58D68D',
  '#5DADE2',
  '#F5B041',
  '#BB8FCE',
  '#F1948A',
  '#48C9B0',
  '#BDC3C7',
  '#A9DFBF',
  '#F0B27A',
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
      color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
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
