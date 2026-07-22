import { AppstoreOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import type { AppStoreApp } from '@/api/appStore';
import Button from '@/components/ui/Button';
import styles from '../Apps/index.module.less';

interface AppCardProps {
  app: AppStoreApp;
  onClick: () => void;
}

export default function AppCard(props: AppCardProps) {
  const { app, onClick } = props;
  const initial = (app.name?.trim()?.slice(0, 1) || 'A').toUpperCase();
  const hasVersion = Boolean(app.latestVersion);

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.cardCover}>
        {app.coverPath ? (
          <img src={app.coverPath} alt="" />
        ) : (
          <span className={styles.cardCoverPlaceholder} aria-hidden>
            {initial}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <div className={styles.cardName}>{app.name}</div>
          <RightOutlined className={styles.cardArrow} aria-hidden />
        </div>
        <div className={styles.cardSlug}>
          {app.ownerSlug}/{app.appSlug}
        </div>
        <div className={styles.cardMetaRow}>
          <span className={`${styles.cardBadge} ${hasVersion ? '' : styles.cardBadgeMuted}`}>
            {hasVersion ? `v${app.latestVersion}` : '暂无版本'}
          </span>
        </div>
        {app.description ? (
          <p className={styles.cardDesc}>{app.description}</p>
        ) : null}
      </div>
    </button>
  );
}

interface AppListEmptyProps {
  keyword?: string;
  canCreate?: boolean;
  onCreate?: () => void;
}

export function AppListEmpty(props: AppListEmptyProps) {
  const { keyword, canCreate, onCreate } = props;
  const isSearch = Boolean(keyword?.trim());

  return (
    <section className={styles.empty}>
      <div className={styles.emptyAmbient} aria-hidden>
        <span className={styles.emptyOrbA} />
        <span className={styles.emptyOrbB} />
      </div>
      <div className={styles.emptyInner}>
        <div className={styles.emptyMark} aria-hidden>
          <AppstoreOutlined />
        </div>
        <div className={styles.emptyCopy}>
          <h3 className={styles.emptyTitle}>
            {isSearch ? '没有找到匹配的应用' : '应用商店还是空的'}
          </h3>
          <p className={styles.emptyDesc}>
            {isSearch
              ? `未找到与「${keyword?.trim()}」相关的应用，试试换个关键词。`
              : '在这里集中管理应用版本与安装包。创建第一个应用，开始发布吧。'}
          </p>
        </div>
        {!isSearch && canCreate && onCreate ? (
          <div className={styles.emptyAction}>
            <Button onClick={onCreate}>
              <PlusOutlined /> 新增应用
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
