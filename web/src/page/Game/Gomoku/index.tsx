import { CopyOutlined, LinkOutlined, LogoutOutlined, StopOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLanAddresses } from '../../../server/system';
import {
  clearGomokuHandlers,
  connectGomokuSocket,
  createGomokuRoom,
  disconnectGomokuSocket,
  joinGomokuRoom,
  leaveGomokuRoom,
  placeGomokuStone,
  registerGomokuUser,
  resignGomokuGame,
  setGomokuHandlers,
} from '../../../utils/gomokuSocket';
import { loadChatIdentity } from '../../../utils/chatIdentity';
import { useGameLayoutActions } from '../context/layoutActions';
import { addGameHistory } from '../utils/gameStorage';
import { BOARD_SIZE, STONE_LABEL, type GameOverReason, type GomokuRoomState, type Stone } from './utils/types';
import styles from './index.module.less';

type Phase = 'connecting' | 'lobby' | 'waiting' | 'playing' | 'finished';

function getRoomFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return (params.get('room') || '').trim().toUpperCase();
}

function buildJoinUrl(roomCode: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomCode);
  return url.toString();
}

function gameOverMessage(room: GomokuRoomState, reason: GameOverReason, yourColor: Stone): string {
  if (reason === 'draw' || room.winner === 0) return '平局！';
  if (reason === 'resign') {
    return room.winner === yourColor ? '对手认输，你赢了！' : '你已认输';
  }
  if (reason === 'opponent_left') {
    return room.winner === yourColor ? '对手离开，你赢了！' : '你已断开连接';
  }
  return room.winner === yourColor ? '恭喜，五连珠！' : '对手五连珠，你输了';
}

function Board(props: {
  board: Stone[][];
  lastMove: { x: number; y: number } | null;
  winLine: [number, number][] | null;
  canPlay: boolean;
  onCellClick: (x: number, y: number) => void;
}) {
  const { board, lastMove, winLine, canPlay, onCellClick } = props;
  const winSet = useMemo(() => {
    const set = new Set<string>();
    winLine?.forEach(([x, y]) => set.add(`${x},${y}`));
    return set;
  }, [winLine]);

  return (
    <div className={styles.boardWrap}>
      <div className={styles.board}>
        {Array.from({ length: BOARD_SIZE }, (_, row) =>
          Array.from({ length: BOARD_SIZE }, (_, col) => {
            const stone = board[row]?.[col] ?? 0;
            const isLast = lastMove?.x === col && lastMove?.y === row;
            const isWin = winSet.has(`${col},${row}`);
            return (
              <button
                key={`${col}-${row}`}
                type="button"
                className={`${styles.cell} ${isLast ? styles.lastMove : ''} ${isWin ? styles.winCell : ''}`}
                disabled={!canPlay || stone !== 0}
                onClick={() => onCellClick(col, row)}
                aria-label={`${col + 1}, ${row + 1}`}
              >
                {stone !== 0 && (
                  <span className={`${styles.stone} ${stone === 1 ? styles.stoneBlack : styles.stoneWhite}`} />
                )}
              </button>
            );
          }),
        )}
        {Array.from({ length: BOARD_SIZE }, (_, i) => (
          <div
            key={`h-${i}`}
            className={styles.gridLineH}
            style={{ top: `${((i + 0.5) / BOARD_SIZE) * 100}%` }}
          />
        ))}
        {Array.from({ length: BOARD_SIZE }, (_, i) => (
          <div
            key={`v-${i}`}
            className={styles.gridLineV}
            style={{ left: `${((i + 0.5) / BOARD_SIZE) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function GomokuHome() {
  const { setActions } = useGameLayoutActions();
  const [phase, setPhase] = useState<Phase>('connecting');
  const [room, setRoom] = useState<GomokuRoomState | null>(null);
  const [yourColor, setYourColor] = useState<Stone>(0);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState(getRoomFromUrl);
  const [lanUrls, setLanUrls] = useState<{ label: string; url: string }[]>([]);
  const [gameOver, setGameOver] = useState<{ reason: GameOverReason; room: GomokuRoomState } | null>(null);
  const [registered, setRegistered] = useState(false);

  const lastMove = room?.moves.length ? room.moves[room.moves.length - 1] : null;

  const resetToLobby = useCallback(() => {
    leaveGomokuRoom();
    setRoom(null);
    setYourColor(0);
    setGameOver(null);
    setPhase('lobby');
    setError('');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url.toString());
  }, []);

  const handleGameOver = useCallback((data: GomokuRoomState & { reason: GameOverReason }) => {
    setRoom(data);
    setYourColor(data.yourColor);
    setPhase('finished');
    setGameOver({ reason: data.reason, room: data });

    const opponent = data.yourColor === 1 ? data.guest : data.host;
    const won = data.winner === data.yourColor;
    addGameHistory({
      gameId: 'gomoku',
      label: won ? '胜利' : data.winner === 0 ? '平局' : '失败',
      completedAt: Date.now(),
      metadata: {
        reason: data.reason,
        yourColor: data.yourColor,
        winner: data.winner,
        moves: data.moves.length,
        opponent: opponent?.username ?? '对手',
      },
    });
  }, []);

  useEffect(() => {
    connectGomokuSocket();
    const identity = loadChatIdentity();

    setGomokuHandlers({
      onRegistered: () => {
        setRegistered(true);
        setPhase('lobby');
        const urlRoom = getRoomFromUrl();
        if (urlRoom) {
          setJoinCode(urlRoom);
          joinGomokuRoom(urlRoom);
        }
      },
      onRoomCreated: data => {
        setRoom(data);
        setYourColor(data.yourColor);
        setPhase('waiting');
        setError('');
      },
      onRoomJoined: data => {
        setRoom(data);
        setYourColor(data.yourColor);
        setPhase(data.status === 'playing' ? 'playing' : 'waiting');
        setError('');
      },
      onRoomUpdate: data => {
        setRoom(data);
        setYourColor(data.yourColor);
        setPhase(data.status === 'playing' ? 'playing' : 'waiting');
      },
      onGameStart: data => {
        setRoom(data);
        setYourColor(data.yourColor);
        setPhase('playing');
        setError('');
      },
      onMove: data => {
        setRoom(data);
        setYourColor(data.yourColor);
      },
      onGameOver: handleGameOver,
      onRoomClosed: data => {
        setError(data.msg);
        resetToLobby();
      },
      onError: data => setError(data.msg),
    });

    registerGomokuUser({ deviceId: identity.deviceId, username: identity.username });

    getLanAddresses()
      .then(res => {
        const addrs = (res.data as { name: string; address: string }[]) || [];
        const port = window.location.port ? `:${window.location.port}` : '';
        setLanUrls(
          addrs.map(lan => ({
            label: `${lan.address} (${lan.name})`,
            url: `http://${lan.address}${port}/game/gomoku`,
          })),
        );
      })
      .catch(() => {});

    return () => {
      clearGomokuHandlers();
      leaveGomokuRoom();
      disconnectGomokuSocket();
    };
  }, [handleGameOver, resetToLobby]);

  useEffect(() => {
    if (phase === 'playing') {
      setActions(
        <button type="button" className={styles.btnDanger} onClick={() => {
          if (confirm('确定认输吗？')) resignGomokuGame();
        }}>
          <StopOutlined /> 认输
        </button>,
      );
    } else if (phase === 'waiting' || phase === 'finished') {
      setActions(
        <button type="button" className={styles.btnSecondary} onClick={resetToLobby}>
          <LogoutOutlined /> 离开房间
        </button>,
      );
    } else {
      setActions(null);
    }
    return () => setActions(null);
  }, [phase, resetToLobby, setActions]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('请输入 6 位房间号');
      return;
    }
    joinGomokuRoom(code);
  };

  const handleCellClick = (x: number, y: number) => {
    if (!room || phase !== 'playing') return;
    if (room.currentTurn !== yourColor) return;
    placeGomokuStone(x, y);
  };

  const joinLinks = room
    ? [
        { label: '本页链接', url: buildJoinUrl(room.code) },
        ...lanUrls.map(l => ({ label: l.label, url: `${l.url}?room=${room.code}` })),
      ]
    : [];

  if (phase === 'connecting' || !registered) {
    return <div className={styles.connecting}>正在连接服务器…</div>;
  }

  return (
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}

      {phase === 'lobby' && (
        <div className={styles.lobby}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>创建房间</h2>
            <p className={styles.cardDesc}>作为房主创建对局，将房间号分享给局域网内的朋友加入。</p>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={() => createGomokuRoom()}>
                创建房间
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>加入房间</h2>
            <p className={styles.cardDesc}>输入房主提供的 6 位房间号，或打开房主分享的链接。</p>
            <div className={styles.joinRow}>
              <input
                className={styles.roomInput}
                value={joinCode}
                maxLength={6}
                placeholder="房间号"
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button type="button" className={styles.btnPrimary} onClick={handleJoin}>
                加入
              </button>
            </div>
          </div>

          {lanUrls.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}><LinkOutlined /> 局域网地址</h2>
              <p className={styles.cardDesc}>同一 WiFi 下的设备可访问以下地址进入五子棋：</p>
              <div className={styles.lanList}>
                {lanUrls.map(item => (
                  <div key={item.label} className={styles.lanItem}>
                    <span>{item.label}</span>
                    <span className={styles.lanUrl}>{item.url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'waiting' && room && (
        <div className={styles.card} style={{ width: '100%' }}>
          <h2 className={styles.cardTitle}>等待对手加入</h2>
          <div className={styles.roomCode}>
            <span className={styles.roomCodeText}>{room.code}</span>
            <button type="button" className={styles.btnSecondary} onClick={() => copyText(room.code)} title="复制房间号">
              <CopyOutlined />
            </button>
          </div>
          <div className={styles.waiting}>
            <span className={styles.pulse} />
            <span>你是黑棋（先手），等待白棋玩家加入…</span>
          </div>
          {joinLinks.length > 0 && (
            <>
              <p className={styles.cardDesc}>分享以下链接，对手打开后自动加入：</p>
              <div className={styles.lanList}>
                {joinLinks.map(item => (
                  <div key={item.url} className={styles.lanItem}>
                    <span>{item.label}</span>
                    <button type="button" className={styles.btnSecondary} onClick={() => copyText(item.url)}>
                      <CopyOutlined /> 复制
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {(phase === 'playing' || phase === 'finished') && room && (
        <>
          <div className={styles.statusBar}>
            <div className={styles.playerInfo}>
              <span className={`${styles.stoneDot} ${styles.black}`} />
              {room.host?.username ?? '黑棋'}
            </div>
            <span className={phase === 'playing' && room.currentTurn === yourColor ? styles.turnHint : styles.turnHintWait}>
              {phase === 'finished'
                ? '对局结束'
                : room.currentTurn === yourColor
                  ? '轮到你落子'
                  : `等待${STONE_LABEL[room.currentTurn]}落子`}
            </span>
            <div className={styles.playerInfo}>
              {room.guest?.username ?? '等待加入'}
              <span className={`${styles.stoneDot} ${styles.white}`} />
            </div>
          </div>

          <Board
            board={room.board}
            lastMove={lastMove}
            winLine={room.winLine}
            canPlay={phase === 'playing' && room.currentTurn === yourColor}
            onCellClick={handleCellClick}
          />
        </>
      )}

      {gameOver && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>{gameOverMessage(gameOver.room, gameOver.reason, yourColor)}</h3>
            <p className={styles.modalDesc}>
              共 {gameOver.room.moves.length} 手
              {gameOver.reason === 'win' && gameOver.room.winner ? ` · ${STONE_LABEL[gameOver.room.winner as Stone]}获胜` : ''}
            </p>
            <button type="button" className={styles.btnPrimary} onClick={resetToLobby}>
              返回大厅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
