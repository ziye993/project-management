const attempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function key(ip, username) {
  return `${ip}:${String(username || '').toLowerCase()}`;
}

export function checkLoginRateLimit(ip, username) {
  const k = key(ip, username);
  const entry = attempts.get(k);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() };
  }

  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    attempts.delete(k);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordLoginFailure(ip, username) {
  const k = key(ip, username);
  const entry = attempts.get(k) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.count = 0;
  }
  attempts.set(k, entry);
}

export function clearLoginAttempts(ip, username) {
  attempts.delete(key(ip, username));
}
