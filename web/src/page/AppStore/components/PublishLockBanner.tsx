import styles from './components.module.less';

interface PublishLockBannerProps {
  conflict: boolean;
  username?: string;
  holding?: boolean;
}

export default function PublishLockBanner(props: PublishLockBannerProps) {
  if (props.conflict) {
    return (
      <div className={`${styles.lockBanner} ${styles.lockConflict}`}>
        该应用正在由「{props.username || '其他用户'}」发布中，请协商；对方退出或锁超时后可继续。
      </div>
    );
  }
  if (props.holding) {
    return (
      <div className={`${styles.lockBanner} ${styles.lockOk}`}>
        已获取发布锁，请完成上传后尽快发布；离开页面将自动释放。
      </div>
    );
  }
  return null;
}
