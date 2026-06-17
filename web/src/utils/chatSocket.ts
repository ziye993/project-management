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

let socket: Socket | null = null;
let handlers: Handlers = {};

export function connectChatSocket() {
  if (socket?.connected) return socket;

  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    path: '/socket.io',
  });

  socket.on('registered', data => handlers.onRegistered?.(data));
  socket.on('userList', data => handlers.onUserList?.(data));
  socket.on('conversationList', data => handlers.onConversationList?.(data));
  socket.on('newMsg', data => handlers.onNewMsg?.(data));
  socket.on('chatHistory', data => handlers.onChatHistory?.(data));
  socket.on('groupList', data => handlers.onGroupList?.(data));
  socket.on('groupCreated', data => handlers.onGroupCreated?.(data));
  socket.on('profileUpdated', data => handlers.onProfileUpdated?.(data));
  socket.on('error', data => handlers.onError?.(data));

  return socket;
}

export function setChatHandlers(next: Handlers) {
  handlers = { ...handlers, ...next };
}

export function registerChatUser(payload: { deviceId: string; username: string; avatar: string }) {
  connectChatSocket().emit('register', payload);
}

export function updateChatProfile(payload: { username?: string; avatar?: string }) {
  socket?.emit('updateProfile', payload);
}

export function sendPrivateMsg(toUserId: string, content: string, type: 'text' | 'image' | 'video' = 'text') {
  socket?.emit('privateMsg', { toUserId, content, type });
}

export function sendGroupMsg(groupId: string, content: string, type: 'text' | 'image' | 'video' = 'text') {
  socket?.emit('groupMsg', { groupId, content, type });
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
  socket?.disconnect();
  socket = null;
}

export function makePrivateConvId(userIdA: string, userIdB: string) {
  return ['private', ...[userIdA, userIdB].sort()].join('::');
}

export function makeGroupConvId(groupId: string) {
  return `group::${groupId}`;
}
