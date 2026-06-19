import { AppstoreOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import styles from './index.module.less';

const games = [
  {
    id: 'sudoku',
    name: '数独',
    desc: '经典数独，支持 4×4、6×6、9×9 与多种难度',
    path: '/game/sudoku',
    accent: 'orange',
    icon: <AppstoreOutlined />,
  },
];

export default function GameHome() {
  const { push } = useNavigate();

  return (
    <div className={styles.box}>
      <p className={styles.subtitle}>选择一款游戏开始</p>
      <div className={styles.grid}>
        {games.map(game => (
          <button
            key={game.id}
            type="button"
            className={styles.card}
            data-accent={game.accent}
            onClick={() => push(game.path)}
          >
            <span className={styles.iconWrap}>{game.icon}</span>
            <span className={styles.cardBody}>
              <span className={styles.cardName}>{game.name}</span>
              <span className={styles.cardDesc}>{game.desc}</span>
            </span>
            <RightOutlined className={styles.cardArrow} />
          </button>
        ))}
      </div>
    </div>
  );
}
