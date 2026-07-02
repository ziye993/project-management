import { EyeOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import type { LinkItem } from '../LinkCopyModal';

interface MediaItemCardProps {
  name: string;
  previewUrl: string;
  isVideo?: boolean;
  links?: LinkItem[];
  onView: () => void;
  onCopyLinks: () => void;
  onDelete: () => void;
}

export default function MediaItemCard(props: MediaItemCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.preview}>
        {props.isVideo ? (
          <video src={props.previewUrl} className={styles.media} muted />
        ) : (
          <img src={props.previewUrl} alt={props.name} className={styles.media} />
        )}
        <div className={styles.overlay}>
          <button type="button" onClick={props.onView}><EyeOutlined /> 查看</button>
          <button type="button" onClick={props.onCopyLinks}><LinkOutlined /> 复制链接</button>
          <button type="button" className={styles.dangerBtn} onClick={props.onDelete}>
            <DeleteOutlined /> 删除
          </button>
        </div>
      </div>
      <p className={styles.name} title={props.name}>{props.name}</p>
    </div>
  );
}
