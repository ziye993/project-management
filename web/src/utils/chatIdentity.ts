import type { ChatIdentity } from '../type/chat';

const STORAGE_KEY = 'chat_identity';

function randomDeviceId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function loadChatIdentity(): ChatIdentity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatIdentity;
      if (parsed.deviceId?.length === 16) return parsed;
    }
  } catch {
    /* ignore */
  }
  const deviceId = randomDeviceId();
  const identity: ChatIdentity = {
    deviceId,
    username: `用户${deviceId.slice(0, 4)}`,
    avatar: deviceId.slice(0, 1).toUpperCase(),
  };
  saveChatIdentity(identity);
  return identity;
}

export function saveChatIdentity(identity: ChatIdentity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}
