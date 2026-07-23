import {
  RightOutlined,
  SearchOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import { useAuth } from '@/hooks/useAuth';
import styles from './index.module.less';

export default function LogHome() {
  const { push } = useNavigate();
  const { isSuperAdmin } = useAuth();

  const entries = [
    {
      name: '普通日志',
      desc: '业务上报与应用发布，按组织/项目权限查询',
      icon: <SearchOutlined />,
      path: '/log/query',
      accent: 'indigo',
    },
    ...(isSuperAdmin ? [{
      name: '系统日志',
      desc: '平台超管操作审计（授权、租户、用户等），不挂组织',
      icon: <AuditOutlined />,
      path: '/log/system',
      accent: 'slate',
    }] : []),
  ];

  return (
    <div className={styles.box}>
      <p className={styles.subtitle}>
        普通日志归属组织/项目；系统日志仅平台超管可见，记录平台侧操作。
      </p>
      <div className={styles.grid}>
        {entries.map(item => (
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
