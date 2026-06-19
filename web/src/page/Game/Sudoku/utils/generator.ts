import { DIFFICULTY_HOLES } from './constants';
import { generateComplete, hasUniqueSolution } from './solver';
import type { Difficulty, SudokuSize } from './types';

export interface GeneratedPuzzle {
  puzzle: number[][];
  solution: number[][];
}

export function generatePuzzle(size: SudokuSize, difficulty: Difficulty): GeneratedPuzzle {
  const solution = generateComplete(size);
  const puzzle = solution.map(row => [...row]);
  const [minHoles, maxHoles] = DIFFICULTY_HOLES[size][difficulty];
  const targetHoles = minHoles + Math.floor(Math.random() * (maxHoles - minHoles + 1));

  const positions: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      positions.push([r, c]);
    }
  }
  positions.sort(() => Math.random() - 0.5);

  let holes = 0;
  for (const [r, c] of positions) {
    if (holes >= targetHoles) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (hasUniqueSolution(puzzle, size)) {
      holes++;
    } else {
      puzzle[r][c] = backup;
    }
  }

  // 若挖空不足，继续尝试
  if (holes < minHoles) {
    for (const [r, c] of positions) {
      if (holes >= targetHoles) break;
      if (puzzle[r][c] === 0) continue;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      if (hasUniqueSolution(puzzle, size)) holes++;
      else puzzle[r][c] = backup;
    }
  }

  return { puzzle, solution };
}

export function createEmptyBoard(size: SudokuSize): {
  board: number[][];
  notes: number[][][];
  fixed: boolean[][];
} {
  const board = Array.from({ length: size }, () => Array(size).fill(0));
  const notes = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [] as number[])
  );
  const fixed = Array.from({ length: size }, () => Array(size).fill(false));
  return { board, notes, fixed };
}

export function initFromPuzzle(puzzle: number[][]): {
  board: number[][];
  notes: number[][][];
  fixed: boolean[][];
} {
  const size = puzzle.length;
  const board = puzzle.map(row => [...row]);
  const notes = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [] as number[])
  );
  const fixed = puzzle.map(row => row.map(v => v !== 0));
  return { board, notes, fixed };
}

export function isBoardComplete(board: number[][], size: SudokuSize): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

export function isBoardCorrect(board: number[][], solution: number[][]): boolean {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}
