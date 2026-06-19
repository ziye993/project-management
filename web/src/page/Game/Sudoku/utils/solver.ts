import { SUDOKU_CONFIG } from './constants';
import type { SudokuSize } from './types';

function isValid(grid: number[][], r: number, c: number, num: number, size: SudokuSize): boolean {
  const { boxRows, boxCols } = SUDOKU_CONFIG[size];
  for (let i = 0; i < size; i++) {
    if (grid[r][i] === num || grid[i][c] === num) return false;
  }
  const boxR = Math.floor(r / boxRows) * boxRows;
  const boxC = Math.floor(c / boxCols) * boxCols;
  for (let i = 0; i < boxRows; i++) {
    for (let j = 0; j < boxCols; j++) {
      if (grid[boxR + i][boxC + j] === num) return false;
    }
  }
  return true;
}

function solveBacktrack(grid: number[][], size: SudokuSize): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) continue;
      const { digits } = SUDOKU_CONFIG[size];
      const shuffled = [...digits].sort(() => Math.random() - 0.5);
      for (const num of shuffled) {
        if (!isValid(grid, r, c, num, size)) continue;
        grid[r][c] = num;
        if (solveBacktrack(grid, size)) return true;
        grid[r][c] = 0;
      }
      return false;
    }
  }
  return true;
}

function countSolutions(grid: number[][], size: SudokuSize, limit = 2): number {
  let count = 0;
  const work = grid.map(row => [...row]);

  function backtrack(): void {
    if (count >= limit) return;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (work[r][c] !== 0) continue;
        const { digits } = SUDOKU_CONFIG[size];
        for (const num of digits) {
          if (!isValid(work, r, c, num, size)) continue;
          work[r][c] = num;
          backtrack();
          work[r][c] = 0;
          if (count >= limit) return;
        }
        return;
      }
    }
    count++;
  }

  backtrack();
  return count;
}

export function solve(grid: number[][], size: SudokuSize): number[][] | null {
  const work = grid.map(row => [...row]);
  if (solveBacktrack(work, size)) return work;
  return null;
}

export function hasUniqueSolution(grid: number[][], size: SudokuSize): boolean {
  return countSolutions(grid, size, 2) === 1;
}

export function fillDiagonalBoxes(size: SudokuSize): number[][] {
  const { boxRows, boxCols, digits } = SUDOKU_CONFIG[size];
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  const boxCount = size / boxRows;

  for (let b = 0; b < boxCount; b++) {
    const nums = [...digits].sort(() => Math.random() - 0.5);
    let idx = 0;
    const startR = b * boxRows;
    const startC = b * boxCols;
    for (let i = 0; i < boxRows; i++) {
      for (let j = 0; j < boxCols; j++) {
        grid[startR + i][startC + j] = nums[idx++];
      }
    }
  }
  return grid;
}

export function generateComplete(size: SudokuSize): number[][] {
  const grid = fillDiagonalBoxes(size);
  solveBacktrack(grid, size);
  return grid;
}
