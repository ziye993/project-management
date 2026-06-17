import { randomUUID } from 'crypto';
import { readJSONFile, writeJSONFile } from '../../utils/jsonFile.js';

const USERS_FILE = 'chat-users.json';
const MESSAGES_FILE = 'chat-messages.json';
const GROUPS_FILE = 'chat-groups.json';
const UNREAD_FILE = 'chat-unread.json';
const CONVS_FILE = 'chat-conversations.json';
const CONV_META_FILE = 'chat-conv-meta.json';

function asObject(data, fallback = {}) {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : fallback;
}

function asArray(data) {
  return Array.isArray(data) ? data : [];
}

export function makeUserId(ip, deviceId) {
  return `${ip}::${deviceId}`;
}

export function makePrivateConvId(userIdA, userIdB) {
  const [a, b] = [userIdA, userIdB].sort();
  return `private:::${a}:::${b}`;
}

function parsePrivateConvId(convId) {
  if (!convId.startsWith('private:::')) return null;
  const parts = convId.split(':::');
  if (parts.length !== 3 || parts[0] !== 'private') return null;
  return [parts[1], parts[2]];
}

export function makeGroupConvId(groupId) {
  return `group::${groupId}`;
}

function readUsers() {
  return asObject(readJSONFile(USERS_FILE, {}));
}

function writeUsers(data) {
  writeJSONFile(USERS_FILE, data);
}

function readMessages() {
  return asObject(readJSONFile(MESSAGES_FILE, {}));
}

function writeMessages(data) {
  writeJSONFile(MESSAGES_FILE, data);
}

function readGroups() {
  const data = readJSONFile(GROUPS_FILE, { groups: [] });
  return { groups: asArray(data?.groups) };
}

function writeGroups(data) {
  writeJSONFile(GROUPS_FILE, { groups: asArray(data?.groups) });
}

function readUnread() {
  return asObject(readJSONFile(UNREAD_FILE, {}));
}

function writeUnread(data) {
  writeJSONFile(UNREAD_FILE, data);
}

function readUserConvs() {
  return asObject(readJSONFile(CONVS_FILE, {}));
}

function writeUserConvs(data) {
  writeJSONFile(CONVS_FILE, data);
}

function readConvMeta() {
  return asObject(readJSONFile(CONV_META_FILE, {}));
}

function writeConvMeta(data) {
  writeJSONFile(CONV_META_FILE, data);
}

function getConvTouchedAt(userId, convId) {
  return readConvMeta()[userId]?.[convId] || 0;
}

export function upsertUser(userId, payload) {
  const users = readUsers();
  users[userId] = {
    ...(users[userId] || {}),
    userId,
    ip: payload.ip,
    deviceId: payload.deviceId,
    username: payload.username || users[userId]?.username || '匿名用户',
    avatar: payload.avatar ?? users[userId]?.avatar ?? '?',
  };
  writeUsers(users);
  return users[userId];
}

export function getUser(userId) {
  return readUsers()[userId] || null;
}

export function updateUserProfile(userId, { username, avatar }) {
  const users = readUsers();
  if (!users[userId]) return null;
  if (username !== undefined) users[userId].username = username;
  if (avatar !== undefined) users[userId].avatar = avatar;
  writeUsers(users);
  return users[userId];
}

export function getAllUsers() {
  return Object.values(readUsers());
}

export function ensureUserConv(userId, convId) {
  const convs = readUserConvs();
  if (!convs[userId]) convs[userId] = [];
  if (!convs[userId].includes(convId)) {
    convs[userId].push(convId);
    writeUserConvs(convs);
  }
}

export function touchUserConv(userId, convId) {
  ensureUserConv(userId, convId);
  const meta = readConvMeta();
  if (!meta[userId]) meta[userId] = {};
  if (!meta[userId][convId]) {
    meta[userId][convId] = Date.now();
    writeConvMeta(meta);
  }
  return meta[userId][convId];
}

export function addMessage(convId, message) {
  const messages = readMessages();
  if (!messages[convId]) messages[convId] = [];
  messages[convId].push(message);
  writeMessages(messages);
  return message;
}

export function getMessages(convId) {
  return asArray(readMessages()[convId]);
}

export function incrementUnread(userId, convId) {
  const unread = readUnread();
  if (!unread[userId]) unread[userId] = {};
  unread[userId][convId] = (unread[userId][convId] || 0) + 1;
  writeUnread(unread);
}

export function clearUnread(userId, convId) {
  const unread = readUnread();
  if (unread[userId]?.[convId]) {
    delete unread[userId][convId];
    writeUnread(unread);
  }
}

export function getUnreadCount(userId, convId) {
  return readUnread()[userId]?.[convId] || 0;
}

function previewText(msg) {
  if (msg.type === 'image') return '[图片]';
  if (msg.type === 'video') return '[视频]';
  return msg.content?.slice(0, 80) || '';
}

function convSortTime(conv) {
  return Math.max(conv.lastTime || 0, conv.openedAt || 0, conv.updatedAt || 0);
}

export function buildConversation(userId, convId, groups) {
  const list = getMessages(convId);
  const last = list[list.length - 1];
  const unreadCount = getUnreadCount(userId, convId);
  const openedAt = getConvTouchedAt(userId, convId);

  if (convId.startsWith('group::')) {
    const groupId = convId.slice('group::'.length);
    const group = groups.find(g => g.id === groupId);
    if (!group || !asArray(group.members).includes(userId)) return null;
    return {
      id: convId,
      type: 'group',
      groupId,
      name: group.name,
      participants: asArray(group.members),
      lastMessage: last ? previewText(last) : '',
      lastTime: last?.time,
      openedAt,
      updatedAt: last?.time || openedAt,
      unreadCount,
    };
  }

  const participants = parsePrivateConvId(convId);
  if (!participants) return null;
  if (!participants.includes(userId)) return null;

  const otherId = participants.find(id => id !== userId);
  const otherUser = otherId ? getUser(otherId) : null;

  return {
    id: convId,
    type: 'private',
    participants,
    peerId: otherId,
    peerName: otherUser?.username,
    peerAvatar: otherUser?.avatar,
    lastMessage: last ? previewText(last) : '',
    lastTime: last?.time,
    openedAt,
    updatedAt: last?.time || openedAt,
    unreadCount,
  };
}

export function getConversationList(userId) {
  const convs = readUserConvs();
  const { groups } = readGroups();
  const ids = asArray(convs[userId]);
  return ids
    .map(convId => buildConversation(userId, convId, groups))
    .filter(Boolean)
    .sort((a, b) => convSortTime(b) - convSortTime(a));
}

export function createMessage({ from, convId, type, content, to }) {
  return {
    id: randomUUID(),
    from,
    to,
    convId,
    type: type || 'text',
    content,
    time: Date.now(),
  };
}

export function getGroupsForUser(userId) {
  const { groups } = readGroups();
  return groups.filter(g => asArray(g.members).includes(userId));
}

export function getAllGroups() {
  return readGroups().groups;
}

export function createGroup({ name, creatorId, memberIds }) {
  const data = readGroups();
  const members = Array.from(new Set([creatorId, ...asArray(memberIds)]));
  const group = {
    id: randomUUID(),
    name,
    creatorId,
    members,
    createdAt: Date.now(),
  };
  data.groups.push(group);
  writeGroups(data);

  const convId = makeGroupConvId(group.id);
  members.forEach(uid => touchUserConv(uid, convId));

  return group;
}

export function getGroup(groupId) {
  return getAllGroups().find(g => g.id === groupId) || null;
}

export function getGroupMemberIds(groupId) {
  const group = getGroup(groupId);
  return asArray(group?.members);
}
