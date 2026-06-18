import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BulbOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import Button from '../../../UiComponents/Button';
import Modal from '../../../UiComponents/Modal';
import message from '../../../UiComponents/Modal/message';
import { useGameLayoutActions } from '../context/layoutActions';
import { DIFFICULTY_LABEL, SIZE_LABEL, SUDOKU_CONFIG } from './utils/constants';
import { generatePuzzle, initFromPuzzle, isBoardComplete, isBoardCorrect } from './utils/generator';
import type { CellPos, Difficulty, Move, SudokuSize } from './utils/types';
import styles from './index.module.less';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function sameBox(r1: number, c1: number, r2: number, c2: number, size: SudokuSize): boolean {
  const { boxRows, boxCols } = SUDOKU_CONFIG[size];
  return (
    Math.floor(r1 / boxRows) === Math.floor(r2 / boxRows) &&
    Math.floor(c1 / boxCols) === Math.floor(c2 / boxCols)
  );
}

export default function SudokuHome() {
  const { setActions } = useGameLayoutActions();
  const [size, setSize] = useState<SudokuSize>(9);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<number[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [board, setBoard] = useState<number[][]>([]);
  const [notes, setNotes] = useState<number[][][]>([]);
  const [fixed, setFixed] = useState<boolean[][]>([]);
  const [selected, setSelected] = useState<CellPos | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [history, setHistory] = useState<Move[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const [winOpen, setWinOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startNewGame = useCallback((newSize?: SudokuSize, newDiff?: Difficulty) => {
    const s = newSize ?? size;
    const d = newDiff ?? difficulty;
    setGenerating(true);
    // 让 UI 有机会刷新 loading 状态
    requestAnimationFrame(() => {
      const { puzzle: p, solution: sol } = generatePuzzle(s, d);
      const init = initFromPuzzle(p);
      setSize(s);
      setDifficulty(d);
      setPuzzle(p);
      setSolution(sol);
      setBoard(init.board);
      setNotes(init.notes);
      setFixed(init.fixed);
      setSelected(null);
      setNoteMode(false);
      setMistakes(0);
      setHistory([]);
      setSeconds(0);
      setPaused(false);
      setCompleted(false);
      setWinOpen(false);
      setGenerating(false);
    });
  }, [size, difficulty]);

  useEffect(() => {
    startNewGame(9, 'medium');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!paused && !completed && puzzle.length > 0) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, completed, puzzle.length]);

  const pushMove = (move: Move) => {
    setHistory(prev => [...prev, move]);
  };

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (!prev.length) return prev;
      const move = prev[prev.length - 1];
      setBoard(b => {
        const next = b.map(row => [...row]);
        next[move.r][move.c] = move.prevValue;
        return next;
      });
      setNotes(n => {
        const next = n.map(row => row.map(cell => [...cell]));
        next[move.r][move.c] = [...move.prevNotes];
        return next;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const handleErase = useCallback(() => {
    if (!selected || fixed[selected.r]?.[selected.c]) return;
    const { r, c } = selected;
    const prevValue = board[r][c];
    const prevNotes = [...notes[r][c]];
    if (prevValue === 0 && prevNotes.length === 0) return;
    pushMove({ type: 'erase', r, c, prevValue, nextValue: 0, prevNotes, nextNotes: [] });
    setBoard(b => {
      const next = b.map(row => [...row]);
      next[r][c] = 0;
      return next;
    });
    setNotes(n => {
      const next = n.map(row => row.map(cell => [...cell]));
      next[r][c] = [];
      return next;
    });
  }, [selected, fixed, board, notes]);

  const handleHint = useCallback(() => {
    if (completed) return;
    const empties: CellPos[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!fixed[r][c] && board[r][c] === 0) empties.push({ r, c });
      }
    }
    if (!empties.length) return;
    const pick = empties[Math.floor(Math.random() * empties.length)];
    const answer = solution[pick.r][pick.c];
    pushMove({
      type: 'value',
      r: pick.r,
      c: pick.c,
      prevValue: board[pick.r][pick.c],
      nextValue: answer,
      prevNotes: [...notes[pick.r][pick.c]],
      nextNotes: [],
    });
    setBoard(b => {
      const next = b.map(row => [...row]);
      next[pick.r][pick.c] = answer;
      return next;
    });
    setNotes(n => {
      const next = n.map(row => row.map(cell => [...cell]));
      next[pick.r][pick.c] = [];
      return next;
    });
    setSelected(pick);
    message.info('已提示一格');
  }, [completed, size, fixed, board, solution, notes]);

  const applyNumber = useCallback((num: number) => {
    if (!selected || completed || fixed[selected.r]?.[selected.c]) return;
    const { r, c } = selected;

    if (noteMode) {
      const prevNotes = [...notes[r][c]];
      let nextNotes: number[];
      if (prevNotes.includes(num)) {
        nextNotes = prevNotes.filter(n => n !== num);
      } else {
        nextNotes = [...prevNotes, num].sort((a, b) => a - b);
      }
      pushMove({
        type: 'note',
        r,
        c,
        prevValue: board[r][c],
        nextValue: board[r][c],
        prevNotes,
        nextNotes,
      });
      setNotes(n => {
        const next = n.map(row => row.map(cell => [...cell]));
        next[r][c] = nextNotes;
        return next;
      });
      return;
    }

    const prevValue = board[r][c];
    const prevNotes = [...notes[r][c]];
    pushMove({
      type: 'value',
      r,
      c,
      prevValue,
      nextValue: num,
      prevNotes,
      nextNotes: [],
    });
    setBoard(b => {
      const next = b.map(row => [...row]);
      next[r][c] = num;
      return next;
    });
    setNotes(n => {
      const next = n.map(row => row.map(cell => [...cell]));
      next[r][c] = [];
      return next;
    });

    if (autoCheck && num !== solution[r][c]) {
      setMistakes(m => m + 1);
    }
  }, [selected, completed, fixed, noteMode, board, notes, solution, autoCheck]);

  useEffect(() => {
    if (!puzzle.length || completed) return;
    if (isBoardComplete(board, size) && isBoardCorrect(board, solution)) {
      setCompleted(true);
      setWinOpen(true);
    }
  }, [board, puzzle.length, completed, size, solution]);

  useEffect(() => {
    setActions(
      <>
        <Button className={styles.headerBtn} onClick={() => startNewGame()}>
          <RedoOutlined /> 新局
        </Button>
        <Button
          className={`${styles.headerBtn} ${noteMode ? styles.headerBtnActive : ''}`}
          onClick={() => setNoteMode(m => !m)}
        >
          <EditOutlined /> 笔记
        </Button>
        <Button className={styles.headerBtn} onClick={handleHint}>
          <BulbOutlined /> 提示
        </Button>
        <Button className={styles.headerBtn} onClick={handleUndo} style={{ opacity: history.length ? 1 : 0.5 }}>
          <UndoOutlined /> 撤销
        </Button>
        <Button className={styles.headerBtn} onClick={handleErase}>
          <DeleteOutlined /> 擦除
        </Button>
        <Button className={styles.headerBtn} onClick={() => setPaused(p => !p)}>
          {paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          {paused ? '继续' : '暂停'}
        </Button>
      </>
    );
    return () => setActions(null);
  }, [setActions, noteMode, paused, history.length, startNewGame, handleHint, handleUndo, handleErase]);

  const selectedValue = selected ? board[selected.r][selected.c] : 0;

  const isError = useCallback((r: number, c: number): boolean => {
    if (!autoCheck) return false;
    const v = board[r][c];
    if (v === 0 || fixed[r][c]) return false;
    return v !== solution[r][c];
  }, [autoCheck, board, fixed, solution]);

  const isHighlighted = useCallback((r: number, c: number): boolean => {
    if (!selected) return false;
    const { r: sr, c: sc } = selected;
    if (r === sr && c === sc) return false;
    if (r === sr || c === sc || sameBox(r, c, sr, sc, size)) return true;
    const sv = board[sr][sc];
    const v = board[r][c];
    return sv !== 0 && v === sv;
  }, [selected, board, size]);

  const digits = SUDOKU_CONFIG[size].digits;
  const { boxRows, boxCols } = SUDOKU_CONFIG[size];

  const digitCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    digits.forEach(d => { counts[d] = 0; });
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const v = board?.[r]?.[c];
        if (v && v > 0) counts[v] = (counts[v] || 0) + 1;
      }
    }
    return counts;
  }, [board, digits, size]);

  if (!puzzle.length) {
    return <div className={styles.loading}>{generating ? '生成谜题中…' : '加载中…'}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.settingGroup}>
          <span className={styles.settingLabel}>规格</span>
          {([4, 6, 9] as SudokuSize[]).map(s => (
            <button
              key={s}
              type="button"
              className={`${styles.settingBtn} ${size === s ? styles.settingBtnActive : ''}`}
              onClick={() => startNewGame(s, difficulty)}
            >
              {SIZE_LABEL[s]}
            </button>
          ))}
        </div>
        <div className={styles.settingGroup}>
          <span className={styles.settingLabel}>难度</span>
          {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(d => (
            <button
              key={d}
              type="button"
              className={`${styles.settingBtn} ${difficulty === d ? styles.settingBtnActive : ''}`}
              onClick={() => startNewGame(size, d)}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={autoCheck}
            onChange={e => setAutoCheck(e.target.checked)}
          />
          自动检查错误
        </label>
      </div>

      <div className={styles.stats}>
        <span>用时 {formatTime(seconds)}</span>
        <span>错误 {mistakes}</span>
        {noteMode && <span className={styles.noteTag}>笔记模式</span>}
        {paused && <span className={styles.pauseTag}>已暂停</span>}
      </div>

      <div className={`${styles.gameArea} ${paused ? styles.gamePaused : ''}`}>
        <div
          className={styles.board}
          style={{
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            ['--box-cols' as string]: boxCols,
            ['--box-rows' as string]: boxRows,
          }}
        >
          {board.map((row, r) =>
            row.map((val, c) => {
              const isSel = selected?.r === r && selected?.c === c;
              const cellNotes = notes[r][c];
              const err = isError(r, c);
              const hl = isHighlighted(r, c);
              const borderRight = (c + 1) % boxCols === 0 && c < size - 1;
              const borderBottom = (r + 1) % boxRows === 0 && r < size - 1;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className={[
                    styles.cell,
                    fixed[r][c] ? styles.cellFixed : '',
                    isSel ? styles.cellSelected : '',
                    hl ? styles.cellHighlight : '',
                    err ? styles.cellError : '',
                    borderRight ? styles.cellBorderRight : '',
                    borderBottom ? styles.cellBorderBottom : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !paused && setSelected({ r, c })}
                  disabled={paused}
                >
                  {val !== 0 ? (
                    <span className={styles.cellValue}>{val}</span>
                  ) : cellNotes.length > 0 ? (
                    <span
                      className={styles.cellNotes}
                      style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(size))}, 1fr)` }}
                    >
                      {digits.map(d => (
                        <span key={d} className={styles.noteDigit}>
                          {cellNotes.includes(d) ? d : ''}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className={styles.pad}>
          {digits.map(d => (
            <button
              key={d}
              type="button"
              className={[
                styles.padBtn,
                selectedValue === d ? styles.padBtnActive : '',
                digitCounts[d] >= size ? styles.padBtnDone : '',
              ].filter(Boolean).join(' ')}
              onClick={() => applyNumber(d)}
              disabled={paused || digitCounts[d] >= size}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Modal
        open={winOpen}
        title="恭喜完成！"
        onClose={() => setWinOpen(false)}
        onOK={() => setWinOpen(false)}
      >
        <div className={styles.winBody}>
          <CheckCircleOutlined className={styles.winIcon} />
          <p>你完成了 {SIZE_LABEL[size]} · {DIFFICULTY_LABEL[difficulty]} 数独</p>
          <p>用时：{formatTime(seconds)}</p>
          <p>错误次数：{mistakes}</p>
          <Button color="primary" onClick={() => { setWinOpen(false); startNewGame(); }}>
            再来一局
          </Button>
        </div>
      </Modal>
    </div>
  );
}
