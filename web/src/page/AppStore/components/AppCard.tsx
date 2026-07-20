import type { AppStoreApp } from '@/api/appStore';
import styles from '../Apps/index.module.less';

interface AppCardProps {
  app: AppStoreApp;
  onClick: () => void;
}

export default function AppCard(props: AppCardProps) {
  const { app, onClick } = props;
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.cardCover}>
        {app.coverPath ? (
          <img src={app.coverPath} alt="" />
        ) : (
          <span className={styles.cardCoverPlaceholder}>{app.name?.slice(0, 1) || 'A'}</span>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{app.name}</div>
        <div className={styles.cardSlug}>{app.ownerSlug}/{app.appSlug}</div>
        <div className={styles.cardMeta}>
          {app.latestVersion ? `最新 ${app.latestVersion}` : '暂无版本'}
        </div>
        {app.description ? (
          <p className={styles.cardDesc}>{app.description}</p>
        ) : null}
      </div>
    </button>
  );
}
