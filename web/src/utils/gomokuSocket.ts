import { io, type Socket } from 'socket.io-client';
import type { GameOverReason, GomokuRoomState } from '../page/Game/Gomoku/utils/types';

type Handlers = {
  onRegistered?: (data: { userId: string; ip: string; username: string }) => void;
  onRoomCreated?: (room: GomokuRoomState) => void;
  onRoomJoined?: (room: GomokuRoomState) => void;
  onRoomUpdate?: (room: GomokuRoomState) => void;
  onGameStart?: (room: GomokuRoomState) => void;
  onMove?: (data: GomokuRoomState & { x: number; y: number; color: number }) => void;
  onGameOver?: (data: GomokuRoomState & { reason: GameOverReason }) => void;
  onRoomClosed?: (data: { msg: string }) => void;
  onLeftRoom?: () => void;
  onError?: (err: { msg: string }) => void;
};

type RegisterPayload = { deviceId: string; username: string };

let socket: Socket | null = null;
let eventsBound = false;
let pendingRegister: RegisterPayload | null = null;
const handlers: { current: Handlers } = { current: {} };

function bindEventsOnce(s: Socket) {
  if (eventsBound) return;
  eventsBound = true;

  s.on('connect', () => {
    if (pendingRegister) s.emit('gomoku:register', pendingRegister);
  });

  s.on('gomoku:registered', data => handlers.current.onRegistered?.(data));
  s.on('gomoku:roomCreated', data => handlers.current.onRoomCreated?.(data));
  s.on('gomoku:roomJoined', data => handlers.current.onRoomJoined?.(data));
  s.on('gomoku:roomUpdate', data => handlers.current.onRoomUpdate?.(data));
  s.on('gomoku:gameStart', data => handlers.current.onGameStart?.(data));
  s.on('gomoku:move', data => handlers.current.onMove?.(data));
  s.on('gomoku:gameOver', data => handlers.current.onGameOver?.(data));
  s.on('gomoku:roomClosed', data => handlers.current.onRoomClosed?.(data));
  s.on('gomoku:leftRoom', () => handlers.current.onLeftRoom?.());
  s.on('gomoku:error', data => handlers.current.onError?.(data));
}

export function connectGomokuSocket() {
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

export function setGomokuHandlers(next: Handlers) {
  handlers.current = { ...handlers.current, ...next };
}

export function clearGomokuHandlers(keys?: (keyof Handlers)[]) {
  if (!keys) {
    handlers.current = {};
    return;
  }
  const next = { ...handlers.current };
  keys.forEach(key => delete next[key]);
  handlers.current = next;
}

export function registerGomokuUser(payload: RegisterPayload) {
  pendingRegister = payload;
  const s = connectGomokuSocket();
  if (s.connected) s.emit('gomoku:register', payload);
}

export function createGomokuRoom() {
  socket?.emit('gomoku:createRoom');
}

export function joinGomokuRoom(roomCode: string) {
  socket?.emit('gomoku:joinRoom', { roomCode });
}

export function placeGomokuStone(x: number, y: number) {
  socket?.emit('gomoku:move', { x, y });
}

export function resignGomokuGame() {
  socket?.emit('gomoku:resign');
}

export function leaveGomokuRoom() {
  socket?.emit('gomoku:leaveRoom');
}

export function disconnectGomokuSocket() {
  pendingRegister = null;
  socket?.disconnect();
  socket = null;
  eventsBound = false;
}
