export type SudokuSize = 4 | 6 | 9;
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface SudokuConfig {
  boxRows: number;
  boxCols: number;
  digits: number[];
}

export interface CellPos {
  r: number;
  c: number;
}

export type MoveType = 'value' | 'note' | 'erase';

export interface Move {
  type: MoveType;
  r: number;
  c: number;
  prevValue: number;
  nextValue: number;
  prevNotes: number[];
  nextNotes: number[];
}

export interface SudokuGameState {
  size: SudokuSize;
  difficulty: Difficulty;
  puzzle: number[][];
  solution: number[][];
  board: number[][];
  notes: number[][][];
  fixed: boolean[][];
  selected: CellPos | null;
  noteMode: boolean;
  mistakes: number;
  history: Move[];
  seconds: number;
  paused: boolean;
  completed: boolean;
  autoCheck: boolean;
}
