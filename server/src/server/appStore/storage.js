import { randomUUID } from 'crypto';
import { SERVER_PORT } from '../../const.js';
import { getConfig, readJSONFile, writeJSONFile } from '../../utils/jsonFile.js';
import { getLanAddresses } from '../../utils/accessLinks.js';
import { compareVersions, isValidVersion } from './version.js';

const STORE_FILE = 'app-store.json';

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const DEFAULT_APP_STORE_CONFIG = {
  lockTtlMs: 40000,
  lockHeartbeatMs: 20000,
  maxPackageBytes: 2147483648,
  maxHistoryVersions: 10,
  maxMajorVersions: 2,
  allowedExts: [],
};

function emptyStore() {
  return { schemaVersion: 1, apps: {} };
}

export function readStore() {
  const data = readJSONFile(STORE_FILE, emptyStore());
  if (!data.apps || typeof data.apps !== 'object') data.apps = {};
  if (!data.schemaVersion) data.schemaVersion = 1;
  return data;
}

export function writeStore(data) {
  writeJSONFile(STORE_FILE, data);
  return data;
}

export function getAppStoreConfig() {
  const config = getConfig() || {};
  const raw = config.appStore && typeof config.appStore === 'object' ? config.appStore : {};
  return {
    ...DEFAULT_APP_STORE_CONFIG,
    ...raw,
    allowedExts: Array.isArray(raw.allowedExts) ? raw.allowedExts : DEFAULT_APP_STORE_CONFIG.allowedExts,
  };
}

export function getPackageRoot() {
  const config = getConfig() || {};
  return config.appStorePackagePath || null;
}

export function buildUpdateUrl(ownerSlug, appSlug) {
  const config = getConfig() || {};
  const urlPath = `/appStore/${encodeURIComponent(ownerSlug)}/${encodeURIComponent(appSlug)}`;
  if (config.publicBaseUrl) {
    return `${String(config.publicBaseUrl).replace(/\/$/, '')}${urlPath}`;
  }
  return `http://localhost:${SERVER_PORT}${urlPath}`;
}

export function buildUpdateLinks(ownerSlug, appSlug) {
  const config = getConfig() || {};
  const urlPath = `/appStore/${encodeURIComponent(ownerSlug)}/${encodeURIComponent(appSlug)}`;
  const links = [];

  if (config.publicBaseUrl) {
    links.push({
      type: 'public',
      label: '公网链接',
      url: `${String(config.publicBaseUrl).replace(/\/$/, '')}${urlPath}`,
    });
  }

  links.push({
    type: 'localhost',
    label: '本机 localhost',
    url: `http://localhost:${SERVER_PORT}${urlPath}`,
  });

  links.push({
    type: 'localhost',
    label: '本机 127.0.0.1',
    url: `http://127.0.0.1:${SERVER_PORT}${urlPath}`,
  });

  for (const lan of getLanAddresses()) {
    links.push({
      type: 'lan',
      label: `局域网 ${lan.address} (${lan.name})`,
      url: `http://${lan.address}:${SERVER_PORT}${urlPath}`,
    });
  }

  return links;
}

export function updateLatestVersion(app) {
  if (!app) return null;
  const versions = app.versions && typeof app.versions === 'object' ? app.versions : {};
  const published = Object.values(versions).filter(
    v => v && v.status === 'published' && isValidVersion(v.version),
  );
  if (!published.length) {
    app.latestVersion = null;
    return null;
  }
  published.sort((a, b) => compareVersions(b, a));
  app.latestVersion = published[0].version;
  return app.latestVersion;
}

function userMeta(user) {
  if (!user) return null;
  return {
    userId: user.id ?? user.userId ?? null,
    username: user.username || '',
  };
}

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

export function listApps(keyword) {
  const store = readStore();
  const kw = typeof keyword === 'string' ? keyword.trim().toLowerCase() : '';
  return Object.values(store.apps)
    .filter(app => app && app.status !== 'archived')
    .filter(app => {
      if (!kw) return true;
      const hay = [app.name, app.ownerSlug, app.appSlug, app.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(kw);
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map(app => ({
      ...app,
      updateUrl: buildUpdateUrl(app.ownerSlug, app.appSlug),
      updateLinks: buildUpdateLinks(app.ownerSlug, app.appSlug),
    }));
}

export function getApp(appId) {
  if (!appId) return null;
  const store = readStore();
  const app = store.apps[appId] || null;
  if (!app) return null;
  return {
    ...app,
    updateUrl: buildUpdateUrl(app.ownerSlug, app.appSlug),
    updateLinks: buildUpdateLinks(app.ownerSlug, app.appSlug),
  };
}

export function findAppBySlug(ownerSlug, appSlug) {
  if (!ownerSlug || !appSlug) return null;
  const store = readStore();
  return Object.values(store.apps).find(
    app => app
      && app.ownerSlug === ownerSlug
      && app.appSlug === appSlug
      && app.status !== 'archived',
  ) || null;
}

/**
 * Create or update an app.
 * Create requires orgId + projectId; ownerSlug auto = org{orgId} (download path).
 * @param {object} payload
 * @param {object} user
 */
export function saveApp(payload, user) {
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const appSlug = typeof payload?.appSlug === 'string' ? payload.appSlug.trim().toLowerCase() : '';
  const description = typeof payload?.description === 'string' ? payload.description : '';
  const coverPath = typeof payload?.coverPath === 'string' ? payload.coverPath : '';
  const status = payload?.status === 'archived' ? 'archived' : 'active';
  const orgId = payload?.orgId != null && payload.orgId !== '' ? Number(payload.orgId) : null;
  const projectId = payload?.projectId != null && payload.projectId !== '' ? Number(payload.projectId) : null;

  if (!name) throw new Error('应用名称不能为空');
  if (!isValidSlug(appSlug)) {
    throw new Error('appSlug 须为小写字母数字与连字符，最长 64');
  }

  const store = readStore();
  const now = Date.now();
  const id = payload?.id && store.apps[payload.id] ? payload.id : null;

  if (id) {
    const app = store.apps[id];
    const ownerSlug = app.ownerSlug;
    for (const existing of Object.values(store.apps)) {
      if (!existing || existing.id === id) continue;
      if (existing.ownerSlug === ownerSlug && existing.appSlug === appSlug && existing.status !== 'archived') {
        throw new Error(`应用标识 ${appSlug} 已存在`);
      }
    }
    app.name = name;
    app.appSlug = appSlug;
    app.description = description;
    app.coverPath = coverPath;
    app.status = status;
    if (orgId != null) app.orgId = orgId;
    if (projectId != null) app.projectId = projectId;
    app.updatedAt = now;
    writeStore(store);
    return getApp(id);
  }

  if (orgId == null || projectId == null) {
    throw new Error('请选择所属组织与项目');
  }
  const ownerSlug = `org${orgId}`;
  if (!isValidSlug(ownerSlug)) {
    throw new Error('组织标识无效');
  }

  for (const existing of Object.values(store.apps)) {
    if (!existing) continue;
    if (existing.ownerSlug === ownerSlug && existing.appSlug === appSlug && existing.status !== 'archived') {
      throw new Error(`该组织下应用标识 ${appSlug} 已存在`);
    }
  }

  const newId = randomUUID();
  const app = {
    id: newId,
    name,
    ownerSlug,
    appSlug,
    orgId,
    projectId,
    coverPath,
    description,
    status,
    createdAt: now,
    updatedAt: now,
    createdBy: userMeta(user),
    latestVersion: null,
    publishLock: null,
    versions: {},
  };
  store.apps[newId] = app;
  writeStore(store);
  return getApp(newId);
}

/** Hard-delete app record from app-store.json (files cleaned by caller). */
export function deleteApp(appId) {
  if (!appId) return false;
  const store = readStore();
  if (!store.apps[appId]) return false;
  delete store.apps[appId];
  writeStore(store);
  return true;
}

export function getAppRaw(appId) {
  if (!appId) return null;
  const store = readStore();
  return store.apps[appId] || null;
}

export function mutateApp(appId, mutator) {
  const store = readStore();
  const app = store.apps[appId];
  if (!app) return null;
  const result = mutator(app, store);
  app.updatedAt = Date.now();
  writeStore(store);
  return result === undefined ? app : result;
}
