import type { SudokuPersistState } from '../../utils/gameStorage';
import type { Difficulty, SudokuSize } from './types';

const SHARE_PREFIX = 's=';

interface SudokuSharePayload {
  v: 1;
  size: SudokuSize;
  difficulty: Difficulty;
  puzzle: number[];
  solution: number[];
  board: number[];
  notes: number[][];
  seconds: number;
  mistakes: number;
  noteMode: boolean;
  autoCheck: boolean;
  completed: boolean;
}

function flat2d(arr: number[][]): number[] {
  return arr.flat();
}

function unflat2d(flat: number[], size: number): number[][] {
  const result: number[][] = [];
  for (let r = 0; r < size; r++) {
    result.push(flat.slice(r * size, (r + 1) * size));
  }
  return result;
}

function flatNotes(notes: number[][][], size: number): number[][] {
  const result: number[][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (notes[r][c].length > 0) {
        result.push([r * size + c, ...notes[r][c]]);
      }
    }
  }
  return result;
}

function unflatNotes(flat: number[][], size: number): number[][][] {
  const notes = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [] as number[]),
  );
  for (const entry of flat) {
    const [idx, ...digits] = entry;
    const r = Math.floor(idx / size);
    const c = idx % size;
    notes[r][c] = digits;
  }
  return notes;
}

export function stateToPayload(state: SudokuPersistState): SudokuSharePayload {
  const { size } = state;
  return {
    v: 1,
    size: state.size,
    difficulty: state.difficulty,
    puzzle: flat2d(state.puzzle),
    solution: flat2d(state.solution),
    board: flat2d(state.board),
    notes: flatNotes(state.notes, size),
    seconds: state.seconds,
    mistakes: state.mistakes,
    noteMode: state.noteMode,
    autoCheck: state.autoCheck,
    completed: state.completed,
  };
}

export function payloadToState(payload: SudokuSharePayload): SudokuPersistState | null {
  const { size } = payload;
  if (![4, 6, 9].includes(size)) return null;
  const puzzle = unflat2d(payload.puzzle, size);
  const solution = unflat2d(payload.solution, size);
  const board = unflat2d(payload.board, size);
  const notes = unflatNotes(payload.notes ?? [], size);
  const fixed = puzzle.map(row => row.map(v => v !== 0));
  return {
    size: payload.size,
    difficulty: payload.difficulty,
    puzzle,
    solution,
    board,
    notes,
    fixed,
    seconds: payload.seconds ?? 0,
    mistakes: payload.mistakes ?? 0,
    noteMode: payload.noteMode ?? false,
    autoCheck: payload.autoCheck ?? true,
    completed: payload.completed ?? false,
  };
}

export function encodeSudokuState(state: SudokuPersistState): string {
  const json = JSON.stringify(stateToPayload(state));
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSudokuState(encoded: string): SudokuPersistState | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json) as SudokuSharePayload;
    if (payload.v !== 1) return null;
    return payloadToState(payload);
  } catch {
    return null;
  }
}

export function buildShareUrl(state: SudokuPersistState): string {
  const encoded = encodeSudokuState(state);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${SHARE_PREFIX}${encoded}`;
}

export function parseShareFromHash(): SudokuPersistState | null {
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  return decodeSudokuState(hash.slice(SHARE_PREFIX.length));
}

export function clearShareHash() {
  if (window.location.hash.startsWith(`#${SHARE_PREFIX}`)) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}
