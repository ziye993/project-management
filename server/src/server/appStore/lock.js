import { randomUUID } from 'crypto';
import { getAppStoreConfig, getAppRaw, mutateApp, readStore, writeStore } from './storage.js';

function isLockExpired(lock, now = Date.now()) {
  if (!lock || !lock.expiresAt) return true;
  return Number(lock.expiresAt) <= now;
}

/**
 * @throws {{ code: 40901, username: string, expiresAt: number }}
 */
export function acquire(appId, user) {
  if (!appId) throw new Error('缺少 appId');
  if (!user?.id) throw new Error('未登录');

  const config = getAppStoreConfig();
  const now = Date.now();
  const store = readStore();
  const app = store.apps[appId];
  if (!app) throw new Error('应用不存在');
  if (app.status === 'archived') throw new Error('应用已归档');

  const lock = app.publishLock;
  if (lock && !isLockExpired(lock, now) && Number(lock.userId) !== Number(user.id)) {
    const err = new Error(
      `该应用正在由「${lock.username || '其他用户'}」发布中，请协商；对方退出或锁超时后可继续。`,
    );
    err.code = 40901;
    err.username = lock.username || '';
    err.expiresAt = lock.expiresAt;
    throw err;
  }

  const token = randomUUID();
  const expiresAt = now + (config.lockTtlMs || 40000);
  app.publishLock = {
    userId: user.id,
    username: user.username || '',
    token,
    expiresAt,
  };
  app.updatedAt = now;
  writeStore(store);

  return {
    lockToken: token,
    expiresAt,
    lockTtlMs: config.lockTtlMs,
    lockHeartbeatMs: config.lockHeartbeatMs,
  };
}

export function heartbeat(appId, userId, lockToken) {
  if (!appId || !lockToken) throw new Error('缺少参数');
  const config = getAppStoreConfig();
  const now = Date.now();
  const store = readStore();
  const app = store.apps[appId];
  if (!app) throw new Error('应用不存在');

  const lock = app.publishLock;
  if (!lock || isLockExpired(lock, now) || lock.token !== lockToken || Number(lock.userId) !== Number(userId)) {
    const err = new Error('发布会话已失效，请重新进入发布。');
    err.code = 40101;
    throw err;
  }

  lock.expiresAt = now + (config.lockTtlMs || 40000);
  app.updatedAt = now;
  writeStore(store);
  return { expiresAt: lock.expiresAt };
}

export function release(appId, userId, lockToken) {
  if (!appId || !lockToken) throw new Error('缺少参数');
  const store = readStore();
  const app = store.apps[appId];
  if (!app) throw new Error('应用不存在');

  const lock = app.publishLock;
  if (!lock) return { released: true };
  if (lock.token !== lockToken || Number(lock.userId) !== Number(userId)) {
    const err = new Error('发布会话已失效，请重新进入发布。');
    err.code = 40101;
    throw err;
  }

  app.publishLock = null;
  app.updatedAt = Date.now();
  writeStore(store);
  return { released: true };
}

export function status(appId) {
  const app = getAppRaw(appId);
  if (!app) return null;
  const lock = app.publishLock;
  if (!lock || isLockExpired(lock)) return null;
  return {
    userId: lock.userId,
    username: lock.username,
    expiresAt: lock.expiresAt,
  };
}

/**
 * Assert current user holds a valid lock. Throws on failure.
 */
export function assertLock(app, userId, lockToken) {
  const lock = app?.publishLock;
  if (!lock || isLockExpired(lock) || lock.token !== lockToken || Number(lock.userId) !== Number(userId)) {
    const err = new Error('发布会话已失效，请重新进入发布。');
    err.code = 40101;
    throw err;
  }
  return true;
}

export function clearLock(appId) {
  mutateApp(appId, app => {
    app.publishLock = null;
  });
}
