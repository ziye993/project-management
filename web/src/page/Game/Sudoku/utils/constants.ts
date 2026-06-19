import type { Difficulty, SudokuConfig, SudokuSize } from './types';

export const SUDOKU_CONFIG: Record<SudokuSize, SudokuConfig> = {
  4: { boxRows: 2, boxCols: 2, digits: [1, 2, 3, 4] },
  6: { boxRows: 2, boxCols: 3, digits: [1, 2, 3, 4, 5, 6] },
  9: { boxRows: 3, boxCols: 3, digits: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
};

/** 挖空数量范围 [min, max] */
export const DIFFICULTY_HOLES: Record<SudokuSize, Record<Difficulty, [number, number]>> = {
  4: {
    easy: [6, 8],
    medium: [8, 10],
    hard: [10, 12],
    expert: [12, 14],
  },
  6: {
    easy: [18, 22],
    medium: [22, 26],
    hard: [26, 30],
    expert: [30, 34],
  },
  9: {
    easy: [36, 42],
    medium: [42, 48],
    hard: [48, 54],
    expert: [54, 60],
  },
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  expert: '专家',
};

export const SIZE_LABEL: Record<SudokuSize, string> = {
  4: '4×4',
  6: '6×6',
  9: '9×9',
};
