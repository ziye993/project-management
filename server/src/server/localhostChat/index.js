import { Server } from 'socket.io';
import server from '../../serverHttp.js';
import {
  addMessage,
  clearUnread,
  createGroup,
  createMessage,
  ensureUserConv,
  getAllUsers,
  getConversationList,
  getGroupMemberIds,
  getGroupsForUser,
  getMessages,
  incrementUnread,
  makeGroupConvId,
  makePrivateConvId,
  makeUserId,
  updateUserProfile,
  upsertUser,
} from './storage.js';

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const onlineSockets = new Map();
const socketMeta = new Map();

function resolveIp(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  const addr = socket.handshake.address || '';
  return addr.replace(/^::ffff:/, '');
}

function getOnlineUserIds() {
  const ids = new Set();
  for (const meta of socketMeta.values()) {
    if (meta.userId) ids.add(meta.userId);
  }
  return ids;
}

function buildUserList() {
  const onlineIds = getOnlineUserIds();
  const persisted = getAllUsers();
  const map = new Map(persisted.map(u => [u.userId, u]));

  for (const userId of onlineIds) {
    const meta = [...socketMeta.values()].find(m => m.userId === userId);
    if (meta) {
      map.set(userId, {
        userId,
        ip: meta.ip,
        deviceId: meta.deviceId,
        username: meta.username,
        avatar: meta.avatar,
        online: true,
      });
    }
  }

  return Array.from(map.values()).map(u => ({
    ...u,
    online: onlineIds.has(u.userId),
  }));
}

function emitToUser(userId, event, data) {
  for (const [socketId, meta] of socketMeta.entries()) {
    if (meta.userId === userId) {
      io.to(socketId).emit(event, data);
    }
  }
}

function emitConversationList(userId) {
  emitToUser(userId, 'conversationList', getConversationList(userId));
}

function broadcastUserList() {
  io.emit('userList', buildUserList());
}

function notifyGroupMembers(groupId, event, data, excludeUserId) {
  getGroupMemberIds(groupId).forEach(uid => {
    if (uid !== excludeUserId) emitToUser(uid, event, data);
  });
}

io.on('connection', socket => {
  const ip = resolveIp(socket);
  socketMeta.set(socket.id, { ip, userId: null, deviceId: '', username: '', avatar: '' });

  socket.on('register', ({ deviceId, username, avatar }) => {
    if (!deviceId || deviceId.length !== 16) {
      socket.emit('error', { msg: '无效的设备 ID' });
      return;
    }

    const userId = makeUserId(ip, deviceId);
    const user = upsertUser(userId, {
      ip,
      deviceId,
      username: username || `用户${deviceId.slice(0, 4)}`,
      avatar: avatar || deviceId.slice(0, 1).toUpperCase(),
    });

    socketMeta.set(socket.id, {
      ip,
      userId,
      deviceId,
      username: user.username,
      avatar: user.avatar,
    });

    if (!onlineSockets.has(userId)) onlineSockets.set(userId, new Set());
    onlineSockets.get(userId).add(socket.id);

    socket.emit('registered', {
      userId,
      ip,
      username: user.username,
      avatar: user.avatar,
    });

    socket.emit('conversationList', getConversationList(userId));
    socket.emit('groupList', getGroupsForUser(userId));
    broadcastUserList();
  });

  socket.on('updateProfile', ({ username, avatar }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId) return;

    const updated = updateUserProfile(meta.userId, { username, avatar });
    if (!updated) return;

    meta.username = updated.username;
    meta.avatar = updated.avatar;
    socketMeta.set(socket.id, meta);

    socket.emit('profileUpdated', {
      userId: meta.userId,
      ip: meta.ip,
      deviceId: meta.deviceId,
      username: updated.username,
      avatar: updated.avatar,
      online: true,
    });
    broadcastUserList();
  });

  socket.on('privateMsg', ({ toUserId, content, type }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId || !toUserId || !content) return;

    const convId = makePrivateConvId(meta.userId, toUserId);
    ensureUserConv(meta.userId, convId);
    ensureUserConv(toUserId, convId);

    const message = createMessage({
      from: meta.userId,
      to: toUserId,
      convId,
      type: type || 'text',
      content,
    });
    addMessage(convId, message);

    incrementUnread(toUserId, convId);

    socket.emit('newMsg', message);
    emitToUser(toUserId, 'newMsg', message);
    emitConversationList(meta.userId);
    emitConversationList(toUserId);
  });

  socket.on('groupMsg', ({ groupId, content, type }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId || !groupId || !content) return;

    const members = getGroupMemberIds(groupId);
    if (!members.includes(meta.userId)) return;

    const convId = makeGroupConvId(groupId);
    const message = createMessage({
      from: meta.userId,
      convId,
      type: type || 'text',
      content,
    });
    addMessage(convId, message);

    members.forEach(uid => {
      if (uid !== meta.userId) incrementUnread(uid, convId);
    });

    socket.emit('newMsg', message);
    notifyGroupMembers(groupId, 'newMsg', message, meta.userId);
    members.forEach(uid => emitConversationList(uid));
  });

  socket.on('getHistory', ({ convId }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId || !convId) return;

    ensureUserConv(meta.userId, convId);
    socket.emit('chatHistory', { convId, messages: getMessages(convId) });
    emitConversationList(meta.userId);
  });

  socket.on('markRead', ({ convId }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId || !convId) return;

    clearUnread(meta.userId, convId);
    emitConversationList(meta.userId);
  });

  socket.on('getGroups', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId) return;
    socket.emit('groupList', getGroupsForUser(meta.userId));
  });

  socket.on('createGroup', ({ name, memberIds }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId || !name?.trim()) return;

    const group = createGroup({
      name: name.trim(),
      creatorId: meta.userId,
      memberIds: memberIds || [],
    });
    const convId = makeGroupConvId(group.id);

    group.members.forEach(uid => {
      emitToUser(uid, 'groupList', getGroupsForUser(uid));
      emitConversationList(uid);
    });

    socket.emit('groupCreated', { group, convId });
  });

  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    if (meta?.userId) {
      const set = onlineSockets.get(meta.userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) onlineSockets.delete(meta.userId);
      }
    }
    socketMeta.delete(socket.id);
    broadcastUserList();
  });
});
