import { AppstoreOutlined, BorderOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { DIFFICULTY_LABEL, SIZE_LABEL } from '../Sudoku/utils/constants';
import {
  deleteSudokuSave,
  loadGameHistory,
  loadSudokuAutoSave,
  loadSudokuSaves,
  type GameHistoryEntry,
  type GameId,
  type SudokuSaveEntry,
} from '../utils/gameStorage';

export interface GameDef {
  id: GameId;
  name: string;
  desc: string;
  path: string;
  accent: 'orange' | 'blue' | 'green';
  icon: ReactNode;
}

export interface ProgressItem {
  id: string;
  kind: 'autosave' | 'save';
  label: string;
  meta: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'sudoku',
    name: '数独',
    desc: '经典数独，支持 4×4、6×6、9×9 与多种难度',
    path: '/game/sudoku',
    accent: 'orange',
    icon: <AppstoreOutlined />,
  },
  {
    id: 'gomoku',
    name: '五子棋',
    desc: '15×15 标准棋盘，局域网双人对战',
    path: '/game/gomoku',
    accent: 'green',
    icon: <BorderOutlined />,
  },
];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatSudokuHistoryMeta(entry: GameHistoryEntry): string {
  const { size, difficulty, seconds, mistakes } = entry.metadata as {
    size?: number;
    difficulty?: string;
    seconds?: number;
    mistakes?: number;
  };
  const sizeLabel = size ? SIZE_LABEL[size as keyof typeof SIZE_LABEL] ?? `${size}×${size}` : '';
  const diffLabel = difficulty ? DIFFICULTY_LABEL[difficulty as keyof typeof DIFFICULTY_LABEL] ?? difficulty : '';
  const time = typeof seconds === 'number' ? formatTime(seconds) : '';
  const err = typeof mistakes === 'number' ? `${mistakes} 次错误` : '';
  return [sizeLabel, diffLabel, time, err].filter(Boolean).join(' · ');
}

export function formatGomokuHistoryMeta(entry: GameHistoryEntry): string {
  const { opponent, moves, yourColor, winner } = entry.metadata as {
    opponent?: string;
    moves?: number;
    yourColor?: number;
    winner?: number;
  };
  const colorLabel = yourColor === 1 ? '黑棋' : yourColor === 2 ? '白棋' : '';
  const result =
    winner === yourColor ? '胜' : winner === 0 ? '平' : '负';
  return [colorLabel, `vs ${opponent ?? '对手'}`, `${moves ?? 0} 手`, result].filter(Boolean).join(' · ');
}

export function formatHistoryMeta(entry: GameHistoryEntry): string {
  if (entry.gameId === 'gomoku') return formatGomokuHistoryMeta(entry);
  return formatSudokuHistoryMeta(entry);
}

/** 按游戏加载「进行中」条目（存档 + 自动保存） */
export function loadProgressForGame(gameId: GameId): ProgressItem[] {
  if (gameId === 'sudoku') {
    const items: ProgressItem[] = [];
    const auto = loadSudokuAutoSave();
    if (auto && !auto.state.completed) {
      items.push({
        id: '__autosave__',
        kind: 'autosave',
        label: `${SIZE_LABEL[auto.state.size]} · ${DIFFICULTY_LABEL[auto.state.difficulty]}`,
        meta: `用时 ${formatTime(auto.state.seconds)} · ${formatDate(auto.savedAt)} 自动保存`,
      });
    }
    loadSudokuSaves().forEach((save: SudokuSaveEntry) => {
      items.push({
        id: save.id,
        kind: 'save',
        label: save.label,
        meta: `${SIZE_LABEL[save.state.size]} · ${DIFFICULTY_LABEL[save.state.difficulty]} · 用时 ${formatTime(save.state.seconds)} · ${formatDate(save.savedAt)}`,
      });
    });
    return items;
  }
  return [];
}

export function loadHistoryForGame(gameId: GameId): GameHistoryEntry[] {
  return loadGameHistory(gameId);
}

export function deleteProgressItem(gameId: GameId, itemId: string) {
  if (gameId === 'sudoku' && itemId !== '__autosave__') {
    deleteSudokuSave(itemId);
  }
}

export function getProgressCount(gameId: GameId): number {
  return loadProgressForGame(gameId).length;
}

export function getHistoryCount(gameId: GameId): number {
  return loadHistoryForGame(gameId).length;
}

export function getContinueTarget(gameId: GameId, item: ProgressItem): { path: string; state?: Record<string, unknown> } {
  const game = GAMES.find(g => g.id === gameId);
  if (gameId === 'sudoku') {
    return item.kind === 'autosave'
      ? { path: game!.path, state: { autosave: true } }
      : { path: game!.path, state: { saveId: item.id } };
  }
  return { path: game?.path ?? '/game/home' };
}
