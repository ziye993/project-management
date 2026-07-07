import styles from './index.module.less';

export interface ConfigAnchorItem {
  key: string;
  label: string;
}

interface ConfigAnchorNavProps {
  items: ConfigAnchorItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function ConfigAnchorNav(props: ConfigAnchorNavProps) {
  const { items, activeKey, onChange } = props;

  return (
    <nav className={styles.nav} aria-label="配置导航">
      <ul className={styles.list}>
        {items.map((item, index) => {
          const active = item.key === activeKey;
          const isLast = index === items.length - 1;
          return (
            <li key={item.key} className={styles.item}>
              <button
                type="button"
                className={`${styles.anchorBtn} ${active ? styles.active : ''}`}
                onClick={() => onChange(item.key)}
              >
                <span className={styles.track} aria-hidden>
                  <span className={`${styles.node} ${active ? styles.nodeActive : ''}`} />
                  {!isLast && <span className={styles.line} />}
                </span>
                <span className={styles.label}>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
