import type { IColorCache } from '../../../type';
import styles from './colorLegend.module.less';

interface IProps {
  colorCache: IColorCache | null;
}

export default function ColorLegend(props: IProps) {
  const { colorCache } = props;
  if (!colorCache?.groups?.length) {
    return (
      <div className={styles.box}>
        <p className={styles.title}>工作区颜色</p>
        <p className={styles.empty}>暂无颜色分组，引入项目后点击「刷新颜色缓存」</p>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <p className={styles.title}>工作区颜色对照</p>
      {colorCache.lastRefreshedAt && (
        <p className={styles.time}>上次刷新：{new Date(colorCache.lastRefreshedAt).toLocaleString()}</p>
      )}
      <ul className={styles.list}>
        {colorCache.groups.map(group => (
          <li key={group.parentPath} className={styles.item}>
            <span className={styles.swatch} style={{ backgroundColor: group.color }} />
            <div className={styles.info}>
              <span className={styles.path} title={group.parentPath}>{group.parentPath}</span>
              <span className={styles.count}>{group.projects.length} 个项目</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
