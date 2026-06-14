import Modal from '../../UiComponents/Modal';
import message from '../../UiComponents/Modal/message';
import styles from './index.module.less';

export interface LinkItem {
  type: string;
  label: string;
  url: string;
}

interface LinkCopyModalProps {
  open: boolean;
  title?: string;
  links: LinkItem[];
  onClose: () => void;
}

export default function LinkCopyModal(props: LinkCopyModalProps) {
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('复制成功');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  return (
    <Modal
      open={props.open}
      title={props.title || '访问链接'}
      onClose={props.onClose}
      onOK={props.onClose}
      width="560px"
    >
      <ul className={styles.list}>
        {props.links.map(link => (
          <li key={link.url} className={styles.item} onClick={() => copy(link.url)}>
            <span className={styles.label}>{link.label}</span>
            <span className={styles.url}>{link.url}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
