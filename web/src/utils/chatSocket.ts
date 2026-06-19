import { io, type Socket } from 'socket.io-client';
import type { ChatGroup, ChatMessage, ChatUser, Conversation } from '../type/chat';

type Handlers = {
  onRegistered?: (data: { userId: string; ip: string; username: string; avatar: string }) => void;
  onUserList?: (users: ChatUser[]) => void;
  onConversationList?: (conversations: Conversation[]) => void;
  onNewMsg?: (msg: ChatMessage) => void;
  onChatHistory?: (data: { convId: string; messages: ChatMessage[] }) => void;
  onGroupList?: (groups: ChatGroup[]) => void;
  onGroupCreated?: (data: { group: ChatGroup; convId: string }) => void;
  onProfileUpdated?: (user: ChatUser) => void;
  onError?: (err: { msg: string }) => void;
};

type RegisterPayload = { deviceId: string; username: string; avatar: string };

let socket: Socket | null = null;
let eventsBound = false;
let pendingRegister: RegisterPayload | null = null;
const handlers: { current: Handlers } = { current: {} };

function bindEventsOnce(s: Socket) {
  if (eventsBound) return;
  eventsBound = true;

  s.on('connect', () => {
    if (pendingRegister) s.emit('register', pendingRegister);
  });

  s.on('registered', data => handlers.current.onRegistered?.(data));
  s.on('userList', data => handlers.current.onUserList?.(data));
  s.on('conversationList', data => handlers.current.onConversationList?.(data));
  s.on('newMsg', data => handlers.current.onNewMsg?.(data));
  s.on('chatHistory', data => handlers.current.onChatHistory?.(data));
  s.on('groupList', data => handlers.current.onGroupList?.(data));
  s.on('groupCreated', data => handlers.current.onGroupCreated?.(data));
  s.on('profileUpdated', data => handlers.current.onProfileUpdated?.(data));
  s.on('error', data => handlers.current.onError?.(data));
}

export function connectChatSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    bindEventsOnce(socket);
  }
  return socket;
}

export function setChatHandlers(next: Handlers) {
  handlers.current = { ...handlers.current, ...next };
}

export function clearChatHandlers(keys?: (keyof Handlers)[]) {
  if (!keys) {
    handlers.current = {};
    return;
  }
  const next = { ...handlers.current };
  keys.forEach(key => delete next[key]);
  handlers.current = next;
}

export function registerChatUser(payload: RegisterPayload) {
  pendingRegister = payload;
  const s = connectChatSocket();
  if (s.connected) {
    s.emit('register', payload);
  }
}

export function updateChatProfile(payload: { username?: string; avatar?: string }) {
  socket?.emit('updateProfile', payload);
}

export function sendPrivateMsg(toUserId: string, content: string, type: 'text' | 'image' | 'video' | 'file' = 'text') {
  socket?.emit('privateMsg', { toUserId, content, type });
}

export function sendGroupMsg(groupId: string, content: string, type: 'text' | 'image' | 'video' | 'file' = 'text') {
  socket?.emit('groupMsg', { groupId, content, type });
}

export function startConversation(convId: string) {
  socket?.emit('startConversation', { convId });
}

export function fetchChatHistory(convId: string) {
  socket?.emit('getHistory', { convId });
}

export function markChatRead(convId: string) {
  socket?.emit('markRead', { convId });
}

export function fetchGroups() {
  socket?.emit('getGroups');
}

export function createChatGroup(name: string, memberIds: string[]) {
  socket?.emit('createGroup', { name, memberIds });
}

export function disconnectChatSocket() {
  pendingRegister = null;
  socket?.disconnect();
  socket = null;
  eventsBound = false;
}

export function makePrivateConvId(userIdA: string, userIdB: string) {
  const [a, b] = [userIdA, userIdB].sort();
  return `private:::${a}:::${b}`;
}

export function makeGroupConvId(groupId: string) {
  return `group::${groupId}`;
}
