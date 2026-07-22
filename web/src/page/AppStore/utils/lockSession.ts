import { lockHeartbeat, releaseLock } from '@/api/appStore';

const DEFAULT_INTERVAL_MS = 20000;

export class LockSession {
  private appId = '';
  private lockToken = '';
  private timer: ReturnType<typeof setInterval> | null = null;
  private unloadBound: (() => void) | null = null;

  get token() {
    return this.lockToken;
  }

  get currentAppId() {
    return this.appId;
  }

  /** Bind lock without starting heartbeat (e.g. immediate release after cancelled acquire). */
  bind(appId: string, lockToken: string) {
    this.appId = appId;
    this.lockToken = lockToken;
  }

  startHeartbeat(appId: string, lockToken: string, intervalMs = DEFAULT_INTERVAL_MS) {
    this.stopHeartbeat();
    this.appId = appId;
    this.lockToken = lockToken;
    if (!appId || !lockToken) return;

    this.timer = setInterval(() => {
      void lockHeartbeat(this.appId, this.lockToken).catch(() => {
        /* TTL will expire lock */
      });
    }, intervalMs);

    this.unloadBound = () => this.releaseOnUnload();
    window.addEventListener('beforeunload', this.unloadBound);
    window.addEventListener('pagehide', this.unloadBound);
  }

  stopHeartbeat() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.unloadBound) {
      window.removeEventListener('beforeunload', this.unloadBound);
      window.removeEventListener('pagehide', this.unloadBound);
      this.unloadBound = null;
    }
  }

  async release() {
    const { appId, lockToken } = this;
    this.stopHeartbeat();
    this.appId = '';
    this.lockToken = '';
    if (!appId || !lockToken) return;
    try {
      await releaseLock(appId, lockToken);
    } catch {
      /* ignore */
    }
  }

  /** Best-effort release via sendBeacon; TTL covers failure. */
  releaseOnUnload() {
    const { appId, lockToken } = this;
    this.stopHeartbeat();
    this.appId = '';
    this.lockToken = '';
    if (!appId || !lockToken || typeof navigator === 'undefined' || !navigator.sendBeacon) return;

    try {
      const blob = new Blob(
        [JSON.stringify({ appId, lockToken })],
        { type: 'application/json' },
      );
      navigator.sendBeacon('/api/appStore/lock/release', blob);
    } catch {
      /* ignore */
    }
  }
}

export function startHeartbeat(appId: string, lockToken: string, intervalMs = DEFAULT_INTERVAL_MS) {
  const session = new LockSession();
  session.startHeartbeat(appId, lockToken, intervalMs);
  return session;
}
