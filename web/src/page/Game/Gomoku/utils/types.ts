export const BOARD_SIZE = 15;

export type Stone = 0 | 1 | 2;
export type Board = Stone[][];
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface GomokuPlayer {
  userId: string;
  username: string;
}

export interface GomokuMove {
  x: number;
  y: number;
  color: Stone;
}

export interface GomokuRoomState {
  code: string;
  status: RoomStatus;
  board: Board;
  currentTurn: Stone;
  moves: GomokuMove[];
  winner: Stone;
  winLine: [number, number][] | null;
  yourColor: Stone;
  host: GomokuPlayer | null;
  guest: GomokuPlayer | null;
  createdAt: number;
}

export type GameOverReason = 'win' | 'draw' | 'resign' | 'opponent_left';

export const STONE_LABEL: Record<Stone, string> = {
  0: '',
  1: '黑棋',
  2: '白棋',
};
