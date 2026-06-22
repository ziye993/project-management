import { HomeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate, useRouterIds } from '../../../Router';
import { GameLayoutActionsProvider, useGameLayoutActions } from '../context/layoutActions';
import styles from './index.module.less';

function GameLayoutInner(props: { children?: React.ReactNode }) {
  const { push } = useNavigate();
  const routerIds = useRouterIds();
  const { actions } = useGameLayoutActions();
  const isSudoku = routerIds.includes('sudoku');
  const isGomoku = routerIds.includes('gomoku');
  const inGame = isSudoku || isGomoku;
  const title = isSudoku ? '数独' : isGomoku ? '五子棋' : '游戏';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.left}>
          <button type="button" className={styles.navBtn} onClick={() => push('/')}>
            <HomeOutlined /> 首页
          </button>
          {inGame && (
            <button type="button" className={styles.navBtn} onClick={() => push('/game/home')}>
              游戏列表
            </button>
          )}
        </div>
        <div className={styles.title}>
          <PlayCircleOutlined /> {title}
        </div>
        <div className={styles.actions}>{actions}</div>
      </header>
      <main className={styles.main}>{props.children}</main>
    </div>
  );
}

export default function GameLayout(props: { children?: React.ReactNode }) {
  return (
    <GameLayoutActionsProvider>
      <GameLayoutInner>{props.children}</GameLayoutInner>
    </GameLayoutActionsProvider>
  );
}
