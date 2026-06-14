import styles from './index.module.less';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell(props: PageShellProps) {
  return (
    <div className={`${styles.shell} ${props.className || ''}`}>
      <div className={styles.ambientBg} aria-hidden />
      <div className={styles.pageInner}>{props.children}</div>
    </div>
  );
}

export { default as shellStyles } from './index.module.less';
