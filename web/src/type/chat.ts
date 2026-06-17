export type MessageType = 'text' | 'image' | 'video';

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
  participants: string[];
  lastMessage?: string;
  lastTime?: number;
  unread?: Record<string, number>;
  unreadCount?: number;
}

export interface ActiveChat {
  convId: string;
  type: 'private' | 'group';
  targetId: string;
  title: string;
}
