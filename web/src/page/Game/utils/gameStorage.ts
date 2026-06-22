import type { Difficulty, SudokuSize } from '../Sudoku/utils/types';

/** 游戏标识，后续新增游戏在此扩展 */
export type GameId = 'sudoku' | 'gomoku';

const HISTORY_KEY = 'game_history';
const SUDOKU_SAVES_KEY = 'game_sudoku_saves';
const SUDOKU_AUTOSAVE_KEY = 'game_sudoku_autosave';
const MAX_HISTORY = 50;
const MAX_SAVES = 20;

/** 已完成游戏的历史记录（通用结构，metadata 存各游戏特有字段） */
export interface GameHistoryEntry {
  id: string;
  gameId: GameId;
  label: string;
  completedAt: number;
  metadata: Record<string, unknown>;
}

/** 数独持久化状态 */
export interface SudokuPersistState {
  size: SudokuSize;
  difficulty: Difficulty;
  puzzle: number[][];
  solution: number[][];
  board: number[][];
  notes: number[][][];
  fixed: boolean[][];
  seconds: number;
  mistakes: number;
  noteMode: boolean;
  autoCheck: boolean;
  completed: boolean;
}

/** 手动保存的数独条目 */
export interface SudokuSaveEntry {
  id: string;
  savedAt: number;
  label: string;
  state: SudokuPersistState;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded */
  }
}

// ── 通用游戏历史 ──

export function loadGameHistory(gameId?: GameId): GameHistoryEntry[] {
  const all = safeParse<GameHistoryEntry[]>(localStorage.getItem(HISTORY_KEY), []);
  if (!Array.isArray(all)) return [];
  return gameId ? all.filter(e => e.gameId === gameId) : all;
}

export function addGameHistory(entry: Omit<GameHistoryEntry, 'id'>): GameHistoryEntry[] {
  const item: GameHistoryEntry = { ...entry, id: `${entry.gameId}_${Date.now()}` };
  const next = [item, ...loadGameHistory()].slice(0, MAX_HISTORY);
  persist(HISTORY_KEY, next);
  return next;
}

export function removeGameHistory(id: string): GameHistoryEntry[] {
  const next = loadGameHistory().filter(e => e.id !== id);
  persist(HISTORY_KEY, next);
  return next;
}

// ── 数独保存 ──

export function loadSudokuSaves(): SudokuSaveEntry[] {
  const saves = safeParse<SudokuSaveEntry[]>(localStorage.getItem(SUDOKU_SAVES_KEY), []);
  return Array.isArray(saves) ? saves : [];
}

export function saveSudokuGame(label: string, state: SudokuPersistState): SudokuSaveEntry {
  const entry: SudokuSaveEntry = {
    id: `save_${Date.now()}`,
    savedAt: Date.now(),
    label,
    state,
  };
  const next = [entry, ...loadSudokuSaves()].slice(0, MAX_SAVES);
  persist(SUDOKU_SAVES_KEY, next);
  return entry;
}

export function updateSudokuSave(id: string, label: string, state: SudokuPersistState): SudokuSaveEntry | null {
  const saves = loadSudokuSaves();
  const idx = saves.findIndex(s => s.id === id);
  if (idx < 0) return null;
  const updated: SudokuSaveEntry = { ...saves[idx], savedAt: Date.now(), label, state };
  saves[idx] = updated;
  persist(SUDOKU_SAVES_KEY, saves);
  return updated;
}

export function getSudokuSave(id: string): SudokuSaveEntry | null {
  return loadSudokuSaves().find(s => s.id === id) ?? null;
}

export function deleteSudokuSave(id: string): SudokuSaveEntry[] {
  const next = loadSudokuSaves().filter(s => s.id !== id);
  persist(SUDOKU_SAVES_KEY, next);
  return next;
}

export function saveSudokuAutoSave(state: SudokuPersistState) {
  persist(SUDOKU_AUTOSAVE_KEY, { savedAt: Date.now(), state });
}

export function loadSudokuAutoSave(): { savedAt: number; state: SudokuPersistState } | null {
  const raw = safeParse<{ savedAt: number; state: SudokuPersistState } | null>(
    localStorage.getItem(SUDOKU_AUTOSAVE_KEY),
    null,
  );
  if (!raw?.state?.puzzle?.length) return null;
  return raw;
}

export function clearSudokuAutoSave() {
  try {
    localStorage.removeItem(SUDOKU_AUTOSAVE_KEY);
  } catch {
    /* ignore */
  }
}
