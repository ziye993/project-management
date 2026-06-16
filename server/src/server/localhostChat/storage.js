import { randomUUID } from 'crypto';
import { readJSONFile, writeJSONFile } from '../../utils/jsonFile.js';

const USERS_FILE = 'chat-users.json';
const MESSAGES_FILE = 'chat-messages.json';
const GROUPS_FILE = 'chat-groups.json';
const UNREAD_FILE = 'chat-unread.json';
const CONVS_FILE = 'chat-conversations.json';

export function makeUserId(ip, deviceId) {
  return `${ip}::${deviceId}`;
}

export function makePrivateConvId(userIdA, userIdB) {
  return ['private', ...[userIdA, userIdB].sort()].join('::');
}

export function makeGroupConvId(groupId) {
  return `group::${groupId}`;
}

function readUsers() {
  return readJSONFile(USERS_FILE, {});
}

function writeUsers(data) {
  writeJSONFile(USERS_FILE, data);
}

function readMessages() {
  return readJSONFile(MESSAGES_FILE, {});
}

function writeMessages(data) {
  writeJSONFile(MESSAGES_FILE, data);
}

function readGroups() {
  return readJSONFile(GROUPS_FILE, { groups: [] });
}

function writeGroups(data) {
  writeJSONFile(GROUPS_FILE, data);
}

function readUnread() {
  return readJSONFile(UNREAD_FILE, {});
}

function writeUnread(data) {
  writeJSONFile(UNREAD_FILE, data);
}

function readUserConvs() {
  return readJSONFile(CONVS_FILE, {});
}

function writeUserConvs(data) {
  writeJSONFile(CONVS_FILE, data);
}

export function upsertUser(userId, payload) {
  const users = readUsers();
  users[userId] = {
    ...users[userId],
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

export function addMessage(convId, message) {
  const messages = readMessages();
  if (!messages[convId]) messages[convId] = [];
  messages[convId].push(message);
  writeMessages(messages);
  return message;
}

export function getMessages(convId) {
  return readMessages()[convId] || [];
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

export function buildConversation(userId, convId, groups) {
  const list = getMessages(convId);
  const last = list[list.length - 1];
  const unreadCount = getUnreadCount(userId, convId);

  if (convId.startsWith('group::')) {
    const groupId = convId.slice('group::'.length);
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.members.includes(userId)) return null;
    return {
      id: convId,
      type: 'group',
      groupId,
      name: group.name,
      participants: group.members,
      lastMessage: last ? previewText(last) : '',
      lastTime: last?.time,
      unreadCount,
    };
  }

  const parts = convId.split('::');
  if (parts[0] !== 'private' || parts.length !== 3) return null;
  const participants = [parts[1], parts[2]];
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
    unreadCount,
  };
}

export function getConversationList(userId) {
  const convs = readUserConvs();
  const { groups } = readGroups();
  const ids = convs[userId] || [];
  return ids
    .map(convId => buildConversation(userId, convId, groups))
    .filter(Boolean)
    .sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
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
  return groups.filter(g => g.members.includes(userId));
}

export function getAllGroups() {
  return readGroups().groups || [];
}

export function createGroup({ name, creatorId, memberIds }) {
  const data = readGroups();
  const members = Array.from(new Set([creatorId, ...memberIds]));
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
  members.forEach(uid => ensureUserConv(uid, convId));

  return group;
}

export function getGroup(groupId) {
  return getAllGroups().find(g => g.id === groupId) || null;
}

export function getGroupMemberIds(groupId) {
  const group = getGroup(groupId);
  return group?.members || [];
}
