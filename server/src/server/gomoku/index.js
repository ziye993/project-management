import { io } from '../socketIo.js';

const BOARD_SIZE = 15;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, object>} */
const rooms = new Map();
/** @type {Map<string, string>} socketId -> roomCode */
const socketRoom = new Map();
/** @type {Map<string, object>} socketId -> meta */
const socketMeta = new Map();

function resolveIp(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  const addr = socket.handshake.address || '';
  return addr.replace(/^::ffff:/, '');
}

function makeUserId(ip, deviceId) {
  return `${ip}_${deviceId}`;
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getWinLine(board, x, y, color) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dx, dy] of dirs) {
    const line = [[x, y]];
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || board[ny][nx] !== color) break;
      line.push([nx, ny]);
    }
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || board[ny][nx] !== color) break;
      line.unshift([nx, ny]);
    }
    if (line.length >= 5) return line.slice(0, 5);
  }
  return null;
}

function serializeRoom(room, viewerUserId) {
  const host = room.players[room.hostUserId];
  const guest = room.guestUserId ? room.players[room.guestUserId] : null;
  const yourColor = viewerUserId === room.hostUserId ? 1 : viewerUserId === room.guestUserId ? 2 : 0;

  return {
    code: room.code,
    status: room.status,
    board: room.board,
    currentTurn: room.currentTurn,
    moves: room.moves,
    winner: room.winner,
    winLine: room.winLine,
    yourColor,
    host: host ? { userId: room.hostUserId, username: host.username } : null,
    guest: guest ? { userId: room.guestUserId, username: guest.username } : null,
    createdAt: room.createdAt,
  };
}

function emitRoom(room, event, extra = {}) {
  for (const userId of [room.hostUserId, room.guestUserId].filter(Boolean)) {
    for (const [socketId, meta] of socketMeta.entries()) {
      if (meta.userId === userId) {
        io.to(socketId).emit(event, { ...serializeRoom(room, userId), ...extra });
      }
    }
  }
}

function emitToUser(userId, event, data) {
  for (const [socketId, meta] of socketMeta.entries()) {
    if (meta.userId === userId) io.to(socketId).emit(event, data);
  }
}

function cleanupRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  for (const userId of [room.hostUserId, room.guestUserId].filter(Boolean)) {
    for (const [socketId, meta] of socketMeta.entries()) {
      if (meta.userId === userId) socketRoom.delete(socketId);
    }
  }
  rooms.delete(code);
}

function leaveRoom(socket) {
  const code = socketRoom.get(socket.id);
  if (!code) return null;
  socketRoom.delete(socket.id);

  const room = rooms.get(code);
  if (!room) return null;

  const meta = socketMeta.get(socket.id);
  if (!meta?.userId) return room;

  if (room.status === 'playing') {
    const winner = meta.userId === room.hostUserId ? 2 : 1;
    room.status = 'finished';
    room.winner = winner;
    emitRoom(room, 'gomoku:gameOver', { reason: 'opponent_left' });
    setTimeout(() => cleanupRoom(code), 5000);
    return room;
  }

  if (meta.userId === room.hostUserId) {
    emitRoom(room, 'gomoku:roomClosed', { msg: '房主已离开，房间已关闭' });
    cleanupRoom(code);
    return null;
  }

  if (meta.userId === room.guestUserId) {
    room.guestUserId = null;
    delete room.players[meta.userId];
    room.status = 'waiting';
    emitRoom(room, 'gomoku:roomUpdate');
  }

  return room;
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL_MS) cleanupRoom(code);
  }
}, 60_000);

io.on('connection', socket => {
  const ip = resolveIp(socket);
  socketMeta.set(socket.id, { ip, userId: null, deviceId: '', username: '' });

  socket.on('gomoku:register', ({ deviceId, username }) => {
    if (!deviceId || deviceId.length !== 16) {
      socket.emit('gomoku:error', { msg: '无效的设备 ID' });
      return;
    }

    const userId = makeUserId(ip, deviceId);
    const displayName = username?.trim() || `棋手${deviceId.slice(0, 4)}`;
    socketMeta.set(socket.id, { ip, userId, deviceId, username: displayName });
    socket.emit('gomoku:registered', { userId, ip, username: displayName });
  });

  socket.on('gomoku:createRoom', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId) {
      socket.emit('gomoku:error', { msg: '请先连接服务器' });
      return;
    }

    leaveRoom(socket);

    const code = generateRoomCode();
    const room = {
      code,
      hostUserId: meta.userId,
      guestUserId: null,
      players: {
        [meta.userId]: { username: meta.username, color: 1 },
      },
      board: createEmptyBoard(),
      currentTurn: 1,
      moves: [],
      status: 'waiting',
      winner: null,
      winLine: null,
      createdAt: Date.now(),
    };

    rooms.set(code, room);
    socketRoom.set(socket.id, code);
    socket.emit('gomoku:roomCreated', serializeRoom(room, meta.userId));
  });

  socket.on('gomoku:joinRoom', ({ roomCode }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId) {
      socket.emit('gomoku:error', { msg: '请先连接服务器' });
      return;
    }

    const code = String(roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      socket.emit('gomoku:error', { msg: '房间不存在或已过期' });
      return;
    }

    if (room.hostUserId === meta.userId) {
      socketRoom.set(socket.id, code);
      socket.emit('gomoku:roomJoined', serializeRoom(room, meta.userId));
      return;
    }

    if (room.guestUserId && room.guestUserId !== meta.userId) {
      socket.emit('gomoku:error', { msg: '房间已满' });
      return;
    }

    leaveRoom(socket);

    room.guestUserId = meta.userId;
    room.players[meta.userId] = { username: meta.username, color: 2 };

    if (room.status === 'waiting') {
      room.status = 'playing';
      room.board = createEmptyBoard();
      room.currentTurn = 1;
      room.moves = [];
      room.winner = null;
      room.winLine = null;
    }

    socketRoom.set(socket.id, code);
    emitRoom(room, 'gomoku:gameStart');
  });

  socket.on('gomoku:move', ({ x, y }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId) return;

    const code = socketRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.status !== 'playing') {
      socket.emit('gomoku:error', { msg: '当前无法落子' });
      return;
    }

    const color = meta.userId === room.hostUserId ? 1 : meta.userId === room.guestUserId ? 2 : 0;
    if (!color || color !== room.currentTurn) {
      socket.emit('gomoku:error', { msg: '还没轮到你' });
      return;
    }

    const col = Number(x);
    const row = Number(y);
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) {
      socket.emit('gomoku:error', { msg: '无效位置' });
      return;
    }

    if (room.board[row][col] !== 0) {
      socket.emit('gomoku:error', { msg: '该位置已有棋子' });
      return;
    }

    room.board[row][col] = color;
    room.moves.push({ x: col, y: row, color });

    const winLine = getWinLine(room.board, col, row, color);
    if (winLine) {
      room.status = 'finished';
      room.winner = color;
      room.winLine = winLine;
      emitRoom(room, 'gomoku:move', { x: col, y: row, color });
      emitRoom(room, 'gomoku:gameOver', { reason: 'win' });
      setTimeout(() => cleanupRoom(code), 60_000);
      return;
    }

    const isFull = room.board.every(rowCells => rowCells.every(cell => cell !== 0));
    if (isFull) {
      room.status = 'finished';
      room.winner = 0;
      emitRoom(room, 'gomoku:move', { x: col, y: row, color });
      emitRoom(room, 'gomoku:gameOver', { reason: 'draw' });
      setTimeout(() => cleanupRoom(code), 60_000);
      return;
    }

    room.currentTurn = color === 1 ? 2 : 1;
    emitRoom(room, 'gomoku:move', { x: col, y: row, color });
  });

  socket.on('gomoku:resign', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.userId) return;

    const code = socketRoom.get(socket.id);
    const room = code ? rooms.get(code) : null;
    if (!room || room.status !== 'playing') return;

    const color = meta.userId === room.hostUserId ? 1 : 2;
    room.status = 'finished';
    room.winner = color === 1 ? 2 : 1;
    emitRoom(room, 'gomoku:gameOver', { reason: 'resign' });
    setTimeout(() => cleanupRoom(code), 5000);
  });

  socket.on('gomoku:leaveRoom', () => {
    leaveRoom(socket);
    socket.emit('gomoku:leftRoom');
  });

  socket.on('disconnect', () => {
    leaveRoom(socket);
    socketMeta.delete(socket.id);
  });
});
