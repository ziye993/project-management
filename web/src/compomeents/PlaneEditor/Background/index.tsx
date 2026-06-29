import styles from './index.module.less';
import { getTheme } from '../themes';

interface BackgroundProps {
  themeId: string;
  title?: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}

export default function Background({ themeId, title, style, children }: BackgroundProps) {
  const theme = getTheme(themeId);
  if (!theme.showBackgroundFrame) {
    return <div style={style}>{children}</div>;
  }

  return (
    <div className={styles.frame} style={style}>
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
