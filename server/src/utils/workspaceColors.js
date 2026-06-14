import path from 'path';
import { getProjectsData, getColorCache, setColorCache } from './jsonFile.js';

const LIGHT_COLORS = [
  '#FFF9C4',
  '#C8E6C9',
  '#BBDEFB',
  '#FFE0B2',
  '#E1BEE7',
  '#F8BBD0',
  '#B2DFDB',
  '#D7CCC8',
  '#F0F4C3',
  '#FFCCBC',
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
      map[project.value] = {
        color: group.color,
        parentPath: group.parentPath,
      };
    }
  }
  return map;
}
