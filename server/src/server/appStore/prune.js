import { compareVersions, isMajorVersion, isValidVersion } from './version.js';
import { getAppStoreConfig, updateLatestVersion } from './storage.js';
import { deletePackageFile } from './packageStore.js';

/**
 * Prune versions after publish:
 * - keep recent maxHistoryVersions published (non-yank)
 * - plus up to maxMajorVersions major versions (X.Y.0.0 no suffix) from all versions
 * - delete metadata + disk for versions not in keep
 * - yank versions also deleted
 * @returns {string[]} deleted version keys
 */
export function pruneVersions(app) {
  if (!app) return [];
  const config = getAppStoreConfig();
  const maxHistory = Number(config.maxHistoryVersions) || 10;
  const maxMajor = Number(config.maxMajorVersions) || 2;

  const versions = app.versions && typeof app.versions === 'object' ? app.versions : {};
  const allEntries = Object.values(versions).filter(v => v && isValidVersion(v.version));

  const published = allEntries
    .filter(v => v.status === 'published')
    .sort((a, b) => compareVersions(b, a));

  const keep = new Set();
  for (const v of published.slice(0, maxHistory)) {
    keep.add(v.version);
  }

  const majors = allEntries
    .filter(v => v.status === 'published' && isMajorVersion(v.version))
    .sort((a, b) => compareVersions(b, a));
  for (const v of majors.slice(0, maxMajor)) {
    keep.add(v.version);
  }

  const deleted = [];
  for (const v of allEntries) {
    const shouldDelete = v.status === 'yanked' || !keep.has(v.version);
    if (!shouldDelete) continue;
    deletePackageFile(app, v.version);
    delete versions[v.version];
    deleted.push(v.version);
  }

  app.versions = versions;
  updateLatestVersion(app);
  return deleted;
}
