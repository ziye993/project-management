import crypto from 'crypto';

const VALID_LEVELS = new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);

export function hashApiKey(plainKey) {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
}

export function validateKeyPrefix(key) {
  return typeof key === 'string' && key.startsWith('sk_');
}

export function generateApiKey() {
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `sk_${randomPart}`;
}

export function isValidLevel(level) {
  return VALID_LEVELS.has(level);
}

export { VALID_LEVELS };
