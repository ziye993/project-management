import { HomeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useRouterIds } from '../../../Router';
import styles from './index.module.less';

const NAV_ITEMS = [
  { path: '/log/home', label: '模块首页', match: 'home' },
  { path: '/log/query', label: '日志查询', match: 'query' },
  { path: '/log/tenants', label: '租户管理', match: 'tenants' },
  { path: '/log/workspace', label: '租户工作台', match: 'workspace' },
];

export default function LogLayout(props: { children?: React.ReactNode }) {
  const { push } = useNavigate();
  const routerIds = useRouterIds();
  const current = routerIds[routerIds.length - 1] || 'home';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.left}>
          <button type="button" className={styles.navBtn} onClick={() => push('/')}>
            <HomeOutlined /> 首页
          </button>
        </div>
        <div className={styles.title}>
          <FileTextOutlined /> 日志管理
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              type="button"
              className={`${styles.navLink} ${current === item.match ? styles.navLinkActive : ''}`}
              onClick={() => push(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className={styles.main}>{props.children}</main>
    </div>
  );
}
