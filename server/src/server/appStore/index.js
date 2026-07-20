import app from '../../app.js';
import { ok, fail } from '../../utils/httpResponse.js';
import {
  listApps,
  getApp,
  saveApp,
  deleteApp,
  getAppRaw,
  getAppStoreConfig,
  mutateApp,
  updateLatestVersion,
  writeStore,
  readStore,
} from './storage.js';
import {
  isValidVersion,
  suggestNext,
  compareVersions,
} from './version.js';
import * as lockApi from './lock.js';
import { pruneVersions } from './prune.js';
import { moveTempToPackage } from './packageStore.js';
import { recordAppStorePublish } from './publishLog.js';

const INVALID_VERSION_MSG = '版本号须为 0~999 四段，可选 -特殊值；不能为 0.0.0.0，最低 0.0.0.1。';

function requireUser(req, res) {
  if (!req.user) {
    fail(res, 401, 401, '请先登录');
    return null;
  }
  return req.user;
}

function handleLockConflict(res, err) {
  if (err?.code === 40901) {
    return fail(
      res,
      409,
      40901,
      err.message || `该应用正在由「${err.username || ''}」发布中，请协商；对方退出或锁超时后可继续。`,
      { username: err.username || '', expiresAt: err.expiresAt || 0 },
    );
  }
  if (err?.code === 40101) {
    return fail(res, 401, 40101, err.message || '发布会话已失效，请重新进入发布。');
  }
  return null;
}

// ─── App CRUD ───────────────────────────────────────────────

app.post('/api/appStore/app/list', (req, res) => {
  try {
    const keyword = req.body?.keyword;
    ok(res, { apps: listApps(keyword) });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '读取应用列表失败');
  }
});

app.post('/api/appStore/app/get', (req, res) => {
  try {
    const appId = req.body?.appId;
    if (!appId) return fail(res, 400, 1, '缺少 appId');
    const record = getApp(appId);
    if (!record || record.status === 'archived') {
      return fail(res, 404, 1, '应用不存在');
    }
    ok(res, { app: record });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '读取应用失败');
  }
});

app.post('/api/appStore/app/save', (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const record = saveApp(req.body ?? {}, user);
    ok(res, { app: record }, '已保存');
  } catch (err) {
    fail(res, 400, 1, err instanceof Error ? err.message : '保存失败');
  }
});

app.post('/api/appStore/app/delete', (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const appId = req.body?.appId;
    if (!appId) return fail(res, 400, 1, '缺少 appId');
    const removed = deleteApp(appId);
    if (!removed) return fail(res, 404, 1, '应用不存在');
    ok(res, { appId }, '已归档');
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '删除失败');
  }
});

// ─── Versions ───────────────────────────────────────────────

app.post('/api/appStore/version/list', (req, res) => {
  try {
    const appId = req.body?.appId;
    if (!appId) return fail(res, 400, 1, '缺少 appId');
    const record = getAppRaw(appId);
    if (!record || record.status === 'archived') {
      return fail(res, 404, 1, '应用不存在');
    }
    const versions = Object.values(record.versions || {})
      .filter(Boolean)
      .sort((a, b) => compareVersions(b, a));
    ok(res, { versions, latestVersion: record.latestVersion });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '读取版本列表失败');
  }
});

app.post('/api/appStore/version/get', (req, res) => {
  try {
    const { appId, version } = req.body || {};
    if (!appId || !version) return fail(res, 400, 1, '缺少 appId 或 version');
    const record = getAppRaw(appId);
    if (!record) return fail(res, 404, 1, '应用不存在');
    const ver = record.versions?.[version];
    if (!ver) return fail(res, 404, 1, '版本不存在');
    ok(res, { version: ver });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '读取版本失败');
  }
});

app.post('/api/appStore/version/suggest', (req, res) => {
  try {
    const appId = req.body?.appId;
    if (!appId) return fail(res, 400, 1, '缺少 appId');
    const record = getAppRaw(appId);
    if (!record) return fail(res, 404, 1, '应用不存在');
    const version = suggestNext(record);
    ok(res, { version });
  } catch (err) {
    fail(res, 400, 1, err instanceof Error ? err.message : '建议版本失败');
  }
});

app.post('/api/appStore/version/publish', async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const body = req.body || {};
    const { appId, lockToken, version, title, changelog, branch, tempFile } = body;

    if (!appId) return fail(res, 400, 1, '缺少 appId');
    if (!lockToken) return fail(res, 400, 1, '缺少 lockToken');
    if (!isValidVersion(version)) return fail(res, 400, 1, INVALID_VERSION_MSG);
    if (!tempFile || typeof tempFile !== 'object') {
      return fail(res, 400, 1, '缺少 tempFile');
    }

    const storeCfg = getAppStoreConfig();
    const fileSize = Number(tempFile.size) || 0;
    if (fileSize > (storeCfg.maxPackageBytes || 2147483648)) {
      return fail(res, 400, 1, '文件超过 2GB 上限。');
    }

    const allowed = storeCfg.allowedExts;
    if (Array.isArray(allowed) && allowed.length > 0) {
      const name = tempFile.originalName || tempFile.storedName || '';
      const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
      if (!allowed.map(e => String(e).replace(/^\./, '').toLowerCase()).includes(ext)) {
        return fail(res, 400, 1, `不允许的文件扩展名: ${ext || '(无)'}`);
      }
    }

    const store = readStore();
    const record = store.apps[appId];
    if (!record || record.status === 'archived') {
      return fail(res, 404, 1, '应用不存在');
    }

    try {
      lockApi.assertLock(record, user.id, lockToken);
    } catch (err) {
      if (handleLockConflict(res, err)) return;
      throw err;
    }

    if (record.versions?.[version]) {
      return fail(res, 400, 1, `版本 ${version} 已存在，请更换版本号。`);
    }

    const fileMeta = moveTempToPackage(appId, version, tempFile);
    const now = Date.now();
    const verRecord = {
      version,
      title: typeof title === 'string' ? title : '',
      changelog: typeof changelog === 'string' ? changelog : '',
      branch: typeof branch === 'string' ? branch : '',
      status: 'published',
      file: fileMeta,
      createdAt: now,
      createdBy: { userId: user.id, username: user.username || '' },
    };

    if (!record.versions) record.versions = {};
    record.versions[version] = verRecord;
    updateLatestVersion(record);
    const deleted = pruneVersions(record);
    record.publishLock = null;
    record.updatedAt = now;
    writeStore(store);

    await recordAppStorePublish(req, {
      appId,
      ownerSlug: record.ownerSlug,
      appSlug: record.appSlug,
      appName: record.name,
      version,
      title: verRecord.title,
      changelog: verRecord.changelog,
      branch: verRecord.branch,
      fileName: fileMeta.originalName,
      fileSize: fileMeta.size,
      mime: fileMeta.mime,
      uploader: { userId: user.id, username: user.username || '' },
      channel: req.channel,
      uploadedAt: now,
    });

    ok(res, {
      version: verRecord,
      latestVersion: record.latestVersion,
      pruned: deleted,
    }, '发布成功');
  } catch (err) {
    if (handleLockConflict(res, err)) return;
    fail(res, 400, 1, err instanceof Error ? err.message : '发布失败');
  }
});

app.post('/api/appStore/version/updateMeta', (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { appId, version, title, changelog } = req.body || {};
    if (!appId || !version) return fail(res, 400, 1, '缺少 appId 或 version');

    const result = mutateApp(appId, app => {
      const ver = app.versions?.[version];
      if (!ver) throw new Error('版本不存在');
      if (typeof title === 'string') ver.title = title;
      if (typeof changelog === 'string') ver.changelog = changelog;
      return ver;
    });

    if (!result) return fail(res, 404, 1, '应用不存在');
    ok(res, { version: result }, '已更新');
  } catch (err) {
    fail(res, 400, 1, err instanceof Error ? err.message : '更新失败');
  }
});

app.post('/api/appStore/version/yank', (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { appId, version } = req.body || {};
    if (!appId || !version) return fail(res, 400, 1, '缺少 appId 或 version');

    const store = readStore();
    const record = store.apps[appId];
    if (!record) return fail(res, 404, 1, '应用不存在');
    const ver = record.versions?.[version];
    if (!ver) return fail(res, 404, 1, '版本不存在');

    ver.status = 'yanked';
    updateLatestVersion(record);
    const deleted = pruneVersions(record);
    record.updatedAt = Date.now();
    writeStore(store);

    ok(res, { version, pruned: deleted, latestVersion: record.latestVersion }, '已下架');
  } catch (err) {
    fail(res, 400, 1, err instanceof Error ? err.message : '下架失败');
  }
});

// ─── Lock ───────────────────────────────────────────────────

app.post('/api/appStore/lock/acquire', (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const appId = req.body?.appId;
    if (!appId) return fail(res, 400, 1, '缺少 appId');
    const result = lockApi.acquire(appId, user);
    ok(res, result);
  } catch (err) {
    if (handleLockConflict(res, err)) return;
    fail(res, 400, 1, err instanceof Error ? err.message : '获取锁失败');
  }
});

app.post('/api/appStore/lock/heartbeat', (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { appId, lockToken } = req.body || {};
    if (!appId || !lockToken) return fail(res, 400, 1, '缺少参数');
    const result = lockApi.heartbeat(appId, user.id, lockToken);
    ok(res, result);
  } catch (err) {
    if (handleLockConflict(res, err)) return;
    fail(res, 400, 1, err instanceof Error ? err.message : '心跳失败');
  }
});

app.post('/api/appStore/lock/release', (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { appId, lockToken } = req.body || {};
    if (!appId || !lockToken) return fail(res, 400, 1, '缺少参数');
    const result = lockApi.release(appId, user.id, lockToken);
    ok(res, result);
  } catch (err) {
    if (handleLockConflict(res, err)) return;
    fail(res, 400, 1, err instanceof Error ? err.message : '释放锁失败');
  }
});

app.post('/api/appStore/lock/status', (req, res) => {
  try {
    const appId = req.body?.appId;
    if (!appId) return fail(res, 400, 1, '缺少 appId');
    if (!getAppRaw(appId)) return fail(res, 404, 1, '应用不存在');
    ok(res, { lock: lockApi.status(appId) });
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '查询锁状态失败');
  }
});
