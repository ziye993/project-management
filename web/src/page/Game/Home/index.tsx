import { useCallback, useMemo, useState } from 'react';
import {
  DeleteOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  RightOutlined,
  SaveOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import { removeGameHistory, type GameHistoryEntry, type GameId } from '../utils/gameStorage';
import {
  deleteProgressItem,
  formatDate,
  formatHistoryMeta,
  GAMES,
  getContinueTarget,
  getHistoryCount,
  getProgressCount,
  loadHistoryForGame,
  loadProgressForGame,
  type GameDef,
  type ProgressItem,
} from './gameConfig';
import styles from './index.module.less';

type DetailTab = 'progress' | 'history';

function GameDetailPanel(props: {
  game: GameDef;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  progress: ProgressItem[];
  history: GameHistoryEntry[];
  onContinue: (item: ProgressItem) => void;
  onDeleteProgress: (itemId: string) => void;
  onDeleteHistory: (id: string) => void;
  onStart: () => void;
}) {
  const { game, tab, onTabChange, progress, history, onContinue, onDeleteProgress, onDeleteHistory, onStart } = props;
  const progressCount = progress.length;
  const historyCount = history.length;

  return (
    <div className={styles.detailPanel} data-accent={game.accent}>
      <div className={styles.detailHeader}>
        <div className={styles.detailTitle}>
          <span className={styles.detailIcon}>{game.icon}</span>
          <div>
            <h3 className={styles.detailName}>{game.name}</h3>
            <p className={styles.detailDesc}>{game.desc}</p>
          </div>
        </div>
        <button type="button" className={styles.startBtn} onClick={onStart}>
          <PlayCircleOutlined /> 开始游戏
        </button>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'progress'}
          className={`${styles.tab} ${tab === 'progress' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('progress')}
        >
          <SaveOutlined />
          进行中
          {progressCount > 0 && <span className={styles.tabBadge}>{progressCount}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('history')}
        >
          <TrophyOutlined />
          完成记录
          {historyCount > 0 && <span className={styles.tabBadge}>{historyCount}</span>}
        </button>
      </div>

      <div className={styles.detailBody}>
        {tab === 'progress' && (
          progress.length === 0 ? (
            <div className={styles.empty}>
              <SaveOutlined className={styles.emptyIcon} />
              <p>暂无进行中的存档</p>
              <span>游戏中可随时保存，或自动保存进度</span>
            </div>
          ) : (
            <ul className={styles.recordList}>
              {progress.map(item => (
                <li key={item.id} className={styles.recordItemWrap}>
                  <button type="button" className={styles.recordItem} onClick={() => onContinue(item)}>
                    <span className={styles.recordMain}>
                      <span className={styles.recordLabel}>{item.label}</span>
                      <span className={styles.recordMeta}>{item.meta}</span>
                    </span>
                    <RightOutlined className={styles.recordArrow} />
                  </button>
                  {item.kind === 'save' && (
                    <button
                      type="button"
                      className={styles.recordDelete}
                      title="删除存档"
                      onClick={e => { e.stopPropagation(); onDeleteProgress(item.id); }}
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'history' && (
          history.length === 0 ? (
            <div className={styles.empty}>
              <HistoryOutlined className={styles.emptyIcon} />
              <p>暂无完成记录</p>
              <span>完成一局后会自动记录在这里</span>
            </div>
          ) : (
            <ul className={styles.recordList}>
              {history.map(entry => (
                <li key={entry.id} className={styles.recordItemWrap}>
                  <div className={styles.recordItemStatic}>
                    <span className={styles.recordMain}>
                      <span className={styles.recordLabel}>{entry.label}</span>
                      <span className={styles.recordMeta}>
                        {formatHistoryMeta(entry)} · {formatDate(entry.completedAt)}
                      </span>
                    </span>
                    <TrophyOutlined className={styles.recordDone} />
                  </div>
                  <button
                    type="button"
                    className={styles.recordDelete}
                    title="删除记录"
                    onClick={() => onDeleteHistory(entry.id)}
                  >
                    <DeleteOutlined />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

export default function GameHome() {
  const { push } = useNavigate();
  const [focusedGameId, setFocusedGameId] = useState<GameId>(GAMES[0]?.id ?? 'sudoku');
  const [detailTab, setDetailTab] = useState<DetailTab>('progress');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const focusedGame = useMemo(
    () => GAMES.find(g => g.id === focusedGameId) ?? GAMES[0],
    [focusedGameId],
  );

  const progress = useMemo(
    () => loadProgressForGame(focusedGameId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focusedGameId, refreshKey],
  );

  const history = useMemo(
    () => loadHistoryForGame(focusedGameId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focusedGameId, refreshKey],
  );

  const handleContinue = (item: ProgressItem) => {
    const { path, state } = getContinueTarget(focusedGameId, item);
    push(path, state);
  };

  const handleDeleteProgress = (itemId: string) => {
    deleteProgressItem(focusedGameId, itemId);
    refresh();
  };

  const handleDeleteHistory = (id: string) => {
    removeGameHistory(id);
    refresh();
  };

  const handleGameHover = (gameId: GameId) => {
    setFocusedGameId(gameId);
  };

  const handleGameClick = (game: GameDef) => {
    push(game.path);
  };

  return (
    <div className={styles.box}>
      <p className={styles.subtitle}>选择游戏，右侧查看该游戏的存档与记录</p>

      <div className={styles.layout}>
        <div className={styles.gameList}>
          {GAMES.map(game => {
            const pCount = getProgressCount(game.id);
            const hCount = getHistoryCount(game.id);
            const isFocused = game.id === focusedGameId;

            return (
              <button
                key={game.id}
                type="button"
                className={`${styles.card} ${isFocused ? styles.cardFocused : ''}`}
                data-accent={game.accent}
                onMouseEnter={() => handleGameHover(game.id)}
                onFocus={() => handleGameHover(game.id)}
                onClick={() => handleGameClick(game)}
              >
                <span className={styles.iconWrap}>{game.icon}</span>
                <span className={styles.cardBody}>
                  <span className={styles.cardName}>{game.name}</span>
                  <span className={styles.cardDesc}>{game.desc}</span>
                  {(pCount > 0 || hCount > 0) && (
                    <span className={styles.cardStats}>
                      {pCount > 0 && <span>{pCount} 进行中</span>}
                      {pCount > 0 && hCount > 0 && <span className={styles.cardStatsDot}>·</span>}
                      {hCount > 0 && <span>{hCount} 已完成</span>}
                    </span>
                  )}
                </span>
                <RightOutlined className={styles.cardArrow} />
              </button>
            );
          })}
        </div>

        <div
          className={styles.detailWrap}
          onMouseEnter={() => handleGameHover(focusedGameId)}
        >
          <GameDetailPanel
            game={focusedGame}
            tab={detailTab}
            onTabChange={setDetailTab}
            progress={progress}
            history={history}
            onContinue={handleContinue}
            onDeleteProgress={handleDeleteProgress}
            onDeleteHistory={handleDeleteHistory}
            onStart={() => push(focusedGame.path)}
          />
        </div>
      </div>
    </div>
  );
}
