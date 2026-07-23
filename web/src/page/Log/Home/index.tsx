import {
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import styles from './index.module.less';

const ENTRIES = [
  {
    name: '日志查询',
    desc: '跨租户检索、筛选与详情查看',
    icon: <SearchOutlined />,
    path: '/log/query',
    accent: 'indigo',
  },
];

export default function LogHome() {
  const { push } = useNavigate();

  return (
    <div className={styles.box}>
      <p className={styles.subtitle}>多租户日志收集与查询。租户 / 项目 / Key 请到「权限管理」配置。</p>
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
