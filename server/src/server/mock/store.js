import crypto from 'crypto';
import {
  createSessionPayload,
  routeKey,
  toPublicSession,
} from './session.js';
import { loadPersistedSessions, savePersistedSessions } from './persistence.js';
import { ensurePortServer, releasePortIfIdle } from './portServer.js';

const sessions = new Map();

function findMatchingSession(port, method, reqPath) {
  const m = String(method).toLowerCase();
  for (const session of sessions.values()) {
    if (session.port !== port) continue;
    if (session.method !== m) continue;
    if (session.pathRegex.test(reqPath)) return session;
  }
  return null;
}

function hasSessionsOnPort(port) {
  for (const session of sessions.values()) {
    if (session.port === port) return true;
  }
  return false;
}

async function ensurePortsForSession(session) {
  await ensurePortServer(session.port, findMatchingSession);
}

function persist() {
  savePersistedSessions([...sessions.values()]);
}

export function listSessions() {
  return [...sessions.values()].map(toPublicSession);
}

export function getSession(mockId) {
  return sessions.get(mockId) ?? null;
}

export function findSessionByRoute(baseUrl, method, openApiPath) {
  const key = `${baseUrl}::${routeKey(method, openApiPath)}`;
  for (const session of sessions.values()) {
    const k = `${session.baseUrl}::${routeKey(session.method, session.openApiPath)}`;
    if (k === key) return session;
  }
  return null;
}

export async function addOrUpdateSession(input) {
  const existing = findSessionByRoute(input.baseUrl, input.method, input.openApiPath);
  const mockId = existing?.mockId ?? input.mockId ?? crypto.randomBytes(6).toString('hex');

  const session = createSessionPayload({ ...input, mockId });
  sessions.set(mockId, session);
  await ensurePortsForSession(session);
  persist();
  return session;
}

export async function addManySessions(items) {
  const results = [];
  for (const item of items) {
    results.push(await addOrUpdateSession(item));
  }
  return results;
}

export async function removeSession(mockId) {
  const session = sessions.get(mockId);
  if (!session) return false;
  const port = session.port;
  sessions.delete(mockId);
  persist();
  await releasePortIfIdle(port, hasSessionsOnPort);
  return true;
}

export async function removeSessionsByFilter({ mockIds, baseUrl, sourceUrl } = {}) {
  let toRemove = [...sessions.values()];

  if (mockIds?.length) {
    const set = new Set(mockIds);
    toRemove = toRemove.filter((s) => set.has(s.mockId));
  } else if (sourceUrl) {
    toRemove = toRemove.filter((s) => s.sourceUrl === sourceUrl);
  } else if (baseUrl) {
    toRemove = toRemove.filter((s) => s.baseUrl === baseUrl);
  }

  const ports = new Set(toRemove.map((s) => s.port));
  for (const s of toRemove) {
    sessions.delete(s.mockId);
  }
  persist();

  for (const port of ports) {
    await releasePortIfIdle(port, hasSessionsOnPort);
  }

  return toRemove.length;
}

export async function restorePersistedSessions() {
  const list = loadPersistedSessions();
  for (const item of list) {
    if (!item.responseSchema || !item.baseUrl || !item.openApiPath) continue;
    sessions.set(item.mockId, item);
    try {
      await ensurePortsForSession(item);
    } catch (err) {
      console.error(`[mock] failed to restore ${item.mockId} on port ${item.port}:`, err.message);
      sessions.delete(item.mockId);
    }
  }
  if (sessions.size !== list.length) {
    persist();
  }
  console.log(`[mock] restored ${sessions.size} session(s)`);
}

export function clearAllSessionsSync() {
  sessions.clear();
  savePersistedSessions([]);
}
