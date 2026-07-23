import {
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import styles from './index.module.less';

const ENTRIES = [
  {
    name: '活动日志',
    desc: '业务上报与应用发布等组织内活动，同一套查询权限',
    icon: <SearchOutlined />,
    path: '/log/query',
    accent: 'indigo',
  },
];

export default function LogHome() {
  const { push } = useNavigate();

  return (
    <div className={styles.box}>
      <p className={styles.subtitle}>
        按组织/项目检索活动记录（含业务日志与应用发布）。权限与「日志查询」能力一致。
      </p>
      <div className={styles.grid}>
        {ENTRIES.map(item => (
          <button
            key={item.path}
            type="button"
            className={styles.card}
            data-accent={item.accent}
            onClick={() => push(item.path)}
          >
            <span className={styles.iconWrap}>{item.icon}</span>
            <span className={styles.cardBody}>
              <span className={styles.cardName}>{item.name}</span>
              <span className={styles.cardDesc}>{item.desc}</span>
            </span>
            <RightOutlined className={styles.cardArrow} />
          </button>
        ))}
      </div>
    </div>
  );
}
