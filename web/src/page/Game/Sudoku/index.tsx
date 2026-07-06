import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BulbOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { copyTextToClipboard } from '@/utils/clipboard';
import { useNavigate } from '../../../Router';
import { useGameLayoutActions } from '../context/layoutActions';
import {
  addGameHistory,
  clearSudokuAutoSave,
  getSudokuSave,
  loadSudokuAutoSave,
  saveSudokuAutoSave,
  saveSudokuGame,
  updateSudokuSave,
  type SudokuPersistState,
} from '../utils/gameStorage';
import { DIFFICULTY_LABEL, SIZE_LABEL, SUDOKU_CONFIG } from './utils/constants';
import { generatePuzzle, initFromPuzzle, isBoardComplete, isBoardCorrect } from './utils/generator';
import {
  buildShareUrl,
  clearShareHash,
  parseShareFromHash,
} from './utils/serialize';
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

function parseInitialLoad(navState?: { saveId?: string; autosave?: boolean } | null): { state: SudokuPersistState; saveId?: string } | null {
  const fromHash = parseShareFromHash();
  if (fromHash) return { state: fromHash };

  const hash = window.location.hash.slice(1);
  if (hash.startsWith('save=')) {
    const saveId = hash.slice(5);
    const entry = getSudokuSave(saveId);
    if (entry) return { state: entry.state, saveId: entry.id };
  }
  if (hash === 'autosave') {
    const auto = loadSudokuAutoSave();
    if (auto) return { state: auto.state };
  }

  if (navState?.saveId) {
    const entry = getSudokuSave(navState.saveId);
    if (entry) return { state: entry.state, saveId: entry.id };
  }
  if (navState?.autosave) {
    const auto = loadSudokuAutoSave();
    if (auto) return { state: auto.state };
  }

  return null;
}

export default function SudokuHome() {
  const { setActions } = useGameLayoutActions();
  const { state: navState } = useNavigate();
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
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRecordedRef = useRef(false);

  const buildPersistState = useCallback((): SudokuPersistState => ({
    size,
    difficulty,
    puzzle,
    solution,
    board,
    notes,
    fixed,
    seconds,
    mistakes,
    noteMode,
    autoCheck,
    completed,
  }), [size, difficulty, puzzle, solution, board, notes, fixed, seconds, mistakes, noteMode, autoCheck, completed]);

  const loadFromState = useCallback((state: SudokuPersistState) => {
    setSize(state.size);
    setDifficulty(state.difficulty);
    setPuzzle(state.puzzle);
    setSolution(state.solution);
    setBoard(state.board);
    setNotes(state.notes);
    setFixed(state.fixed);
    setSelected(null);
    setNoteMode(state.noteMode);
    setMistakes(state.mistakes);
    setHistory([]);
    setSeconds(state.seconds);
    setPaused(false);
    setCompleted(state.completed);
    setWinOpen(state.completed);
    setAutoCheck(state.autoCheck);
    historyRecordedRef.current = state.completed;
  }, []);

  const startNewGame = useCallback((newSize?: SudokuSize, newDiff?: Difficulty) => {
    const s = newSize ?? size;
    const d = newDiff ?? difficulty;
    setGenerating(true);
    setCurrentSaveId(null);
    clearShareHash();
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
      historyRecordedRef.current = false;
    });
  }, [size, difficulty]);

  useEffect(() => {
    const loaded = parseInitialLoad(navState);
    if (loaded) {
      loadFromState(loaded.state);
      if (loaded.saveId) setCurrentSaveId(loaded.saveId);
      setGenerating(false);
      return;
    }
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

  // 自动保存进度（未完成时）
  useEffect(() => {
    if (!puzzle.length || completed) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveSudokuAutoSave(buildPersistState());
    }, 800);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [puzzle.length, completed, buildPersistState]);

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

  const handleSave = useCallback(() => {
    const defaultLabel = `${SIZE_LABEL[size]} · ${DIFFICULTY_LABEL[difficulty]} · ${formatTime(seconds)}`;
    setSaveLabel(defaultLabel);
    setSaveOpen(true);
  }, [size, difficulty, seconds]);

  const confirmSave = useCallback(() => {
    const label = saveLabel.trim() || `${SIZE_LABEL[size]} · ${DIFFICULTY_LABEL[difficulty]}`;
    const state = buildPersistState();
    if (currentSaveId) {
      updateSudokuSave(currentSaveId, label, state);
      message.success('已更新保存');
    } else {
      const entry = saveSudokuGame(label, state);
      setCurrentSaveId(entry.id);
      message.success('已保存，可在游戏列表中继续');
    }
    setSaveOpen(false);
  }, [saveLabel, size, difficulty, buildPersistState, currentSaveId]);

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(buildPersistState());
    const ok = await copyTextToClipboard(url);
    if (ok) message.success('分享链接已复制到剪贴板');
    else message.info(url);
  }, [buildPersistState]);

  // 键盘快捷键
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (paused || completed || !puzzle.length) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleErase();
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setNoteMode(m => !m);
        return;
      }

      if (selected) {
        const arrows: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
        };
        const delta = arrows[e.key];
        if (delta) {
          e.preventDefault();
          const nr = Math.max(0, Math.min(size - 1, selected.r + delta[0]));
          const nc = Math.max(0, Math.min(size - 1, selected.c + delta[1]));
          setSelected({ r: nr, c: nc });
          return;
        }
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= size) {
        e.preventDefault();
        applyNumber(num);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paused, completed, puzzle.length, selected, size, handleUndo, handleErase, applyNumber]);

  useEffect(() => {
    if (!puzzle.length || completed) return;
    if (isBoardComplete(board, size) && isBoardCorrect(board, solution)) {
      setCompleted(true);
      setWinOpen(true);
      clearSudokuAutoSave();
      if (!historyRecordedRef.current) {
        historyRecordedRef.current = true;
        addGameHistory({
          gameId: 'sudoku',
          label: `${SIZE_LABEL[size]} · ${DIFFICULTY_LABEL[difficulty]}`,
          completedAt: Date.now(),
          metadata: { size, difficulty, seconds, mistakes },
        });
      }
    }
  }, [board, puzzle.length, completed, size, solution, difficulty, seconds, mistakes]);

  useEffect(() => {
    setActions(
      <>
        <Button className={styles.headerBtn} onClick={() => startNewGame()}>
          <RedoOutlined /> 新局
        </Button>
        <Button className={styles.headerBtn} onClick={handleSave}>
          <SaveOutlined /> 保存
        </Button>
        <Button className={styles.headerBtn} onClick={handleShare}>
          <LinkOutlined /> 分享
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
  }, [setActions, noteMode, paused, history.length, startNewGame, handleHint, handleUndo, handleErase, handleSave, handleShare]);

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

      <p className={styles.shortcutsHint}>
        快捷键：数字键填格 · Ctrl+Z 撤销 · Delete 擦除 · N 切换笔记 · 方向键移动
      </p>

      <div className={`${styles.gameArea} ${paused ? styles.gamePaused : ''}`}>
        <div
          className={styles.board}
          style={{
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
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
                  ) : (
                    <span className={styles.cellPlaceholder} aria-hidden />
                  )}
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

      <Modal
        open={saveOpen}
        title="保存数独"
        onClose={() => setSaveOpen(false)}
        onOK={confirmSave}
      >
        <div className={styles.saveBody}>
          <label className={styles.saveLabel}>
            存档名称
            <input
              className={styles.saveInput}
              value={saveLabel}
              onChange={e => setSaveLabel(e.target.value)}
              placeholder="给这局数独起个名字"
              onKeyDown={e => e.key === 'Enter' && confirmSave()}
            />
          </label>
          <p className={styles.saveHint}>保存后可在游戏列表中继续，也可通过「分享」生成链接</p>
        </div>
      </Modal>
    </div>
  );
}
