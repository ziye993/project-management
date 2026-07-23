import { post } from '.';
import message from '@/components/ui/Modal/message';

export interface AppStoreApp {
  id: string;
  name: string;
  ownerSlug: string;
  appSlug: string;
  orgId?: number | null;
  projectId?: number | null;
  coverPath?: string;
  description?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: { userId: number; username: string };
  latestVersion?: string | null;
  publishLock?: unknown;
  updateUrl?: string;
  updateLinks?: Array<{ type: string; label: string; url: string }>;
}

export interface AppStoreVersionFile {
  originalName: string;
  storedName: string;
  relativePath: string;
  size: number;
  mime?: string;
}

export interface AppStoreVersion {
  version: string;
  title?: string;
  changelog?: string;
  branch?: string;
  status: 'published' | 'yanked' | string;
  file?: AppStoreVersionFile;
  createdAt?: number;
  createdBy?: { userId: number; username: string };
}

export interface AppStoreTempFile {
  storedName: string;
  relativePath: string;
  originalName: string;
  size: number;
  mime: string;
}

export const listApps = (keyword?: string) =>
  post('/appStore/app/list', keyword ? { keyword } : {}) as Promise<{ data: { apps: AppStoreApp[] } }>;

export const getApp = (appId: string) =>
  post('/appStore/app/get', { appId }) as Promise<{ data: { app: AppStoreApp } }>;

export const saveApp = (payload: {
  id?: string;
  name: string;
  appSlug: string;
  description: string;
  orgId?: number;
  projectId?: number;
  coverPath?: string;
  status?: string;
}) => post('/appStore/app/save', payload) as Promise<{ data: { app: AppStoreApp } }>;

export const deleteApp = (appId: string) =>
  post('/appStore/app/delete', { appId });

export const listVersions = (appId: string) =>
  post('/appStore/version/list', { appId }) as Promise<{
    data: { versions: AppStoreVersion[]; latestVersion: string | null };
  }>;

export const suggestVersion = (appId: string) =>
  post('/appStore/version/suggest', { appId }) as Promise<{ data: { version: string } }>;

export const publishVersion = (payload: {
  appId: string;
  lockToken: string;
  version: string;
  title: string;
  changelog: string;
  branch?: string;
  tempFile: AppStoreTempFile;
}) => post('/appStore/version/publish', payload) as Promise<{
  data: { version: AppStoreVersion; latestVersion: string | null; pruned?: unknown };
}>;

export const updateVersionMeta = (payload: {
  appId: string;
  version: string;
  title?: string;
  changelog?: string;
}) => post('/appStore/version/updateMeta', payload) as Promise<{ data: { version: AppStoreVersion } }>;

export const yankVersion = (appId: string, version: string) =>
  post('/appStore/version/yank', { appId, version });

export const lockHeartbeat = (appId: string, lockToken: string) =>
  post('/appStore/lock/heartbeat', { appId, lockToken }) as Promise<{ data: { expiresAt: number } }>;

export const releaseLock = (appId: string, lockToken: string) =>
  post('/appStore/lock/release', { appId, lockToken });

export const lockStatus = (appId: string) =>
  post('/appStore/lock/status', { appId }) as Promise<{
    data: { lock: { userId: number; username: string; expiresAt: number } | null };
  }>;

export type AcquireLockResult =
  | {
      conflict: false;
      lockToken: string;
      expiresAt: number;
      lockTtlMs?: number;
      lockHeartbeatMs?: number;
    }
  | {
      conflict: true;
      username: string;
      expiresAt: number;
      msg?: string;
    };

/** Custom fetch so 40901 can be handled without treating it as a hard failure toast. */
export async function acquireLock(appId: string): Promise<AcquireLockResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let res: Response;
  try {
    res = await fetch(`${origin}/api/appStore/lock/acquire`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId }),
    });
  } catch (error) {
    message.error({ content: '无法连接服务器' });
    throw error;
  }

  const json = await res.json();
  if (Number(json.code) === 40901 || res.status === 409) {
    return {
      conflict: true,
      username: json.data?.username || '',
      expiresAt: Number(json.data?.expiresAt) || 0,
      msg: json.msg,
    };
  }

  if (!(json.code === 0 || json.success === true)) {
    message.error({ content: json?.msg || '获取锁失败' });
    throw new Error(`请求失败 code：${json.code}`);
  }

  return {
    conflict: false,
    lockToken: json.data.lockToken,
    expiresAt: json.data.expiresAt,
    lockTtlMs: json.data.lockTtlMs,
    lockHeartbeatMs: json.data.lockHeartbeatMs,
  };
}
