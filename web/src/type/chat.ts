export type MessageType = 'text' | 'image' | 'video' | 'file';

export interface ChatIdentity {
  deviceId: string;
  username: string;
  avatar: string;
}

export interface ChatUser {
  userId: string;
  ip: string;
  deviceId: string;
  username: string;
  avatar: string;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  to?: string;
  convId: string;
  type: MessageType;
  content: string;
  time: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  creatorId: string;
  members: string[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  groupId?: string;
  name?: string;
  peerId?: string;
  peerName?: string;
  peerAvatar?: string;
  participants: string[];
  lastMessage?: string;
  lastTime?: number;
  openedAt?: number;
  updatedAt?: number;
  unread?: Record<string, number>;
  unreadCount?: number;
}

export interface ActiveChat {
  convId: string;
  type: 'private' | 'group';
  targetId: string;
  title: string;
}
