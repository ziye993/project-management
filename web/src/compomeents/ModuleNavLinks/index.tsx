import { useNavigate } from '../../Router';
import styles from './index.module.less';

export interface ModuleNavItem {
  path: string;
  label: string;
  match: string;
  hidden?: boolean;
}

interface ModuleNavLinksProps {
  items: ModuleNavItem[];
  current: string;
  trailing?: React.ReactNode;
}

export default function ModuleNavLinks(props: ModuleNavLinksProps) {
  const { push } = useNavigate();

  return (
    <nav className={styles.nav}>
      {props.items.map(item => {
        if (item.hidden) return null;
        return (
          <button
            key={item.path}
            type="button"
            className={`${styles.navLink} ${props.current === item.match ? styles.navLinkActive : ''}`}
            onClick={() => push(item.path)}
          >
            {item.label}
          </button>
        );
      })}
      {props.trailing}
    </nav>
  );
}
