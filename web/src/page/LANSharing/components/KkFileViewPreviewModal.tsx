import Modal from '@/components/ui/Modal';
import { ExportOutlined } from '@ant-design/icons';
import styles from './KkFileViewPreviewModal.module.less';

interface KkFileViewPreviewModalProps {
  open: boolean;
  title?: string;
  previewUrl: string;
  onClose: () => void;
}

export default function KkFileViewPreviewModal(props: KkFileViewPreviewModalProps) {
  const { open, title, previewUrl, onClose } = props;

  const openInNewTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal open={open} title={title || '文件预览'} onClose={onClose} onOK={onClose} width="90vw">
      <div className={styles.wrap}>
        <div className={styles.toolbar}>
          <button type="button" className={styles.openBtn} onClick={openInNewTab}>
            <ExportOutlined /> 新页面打开
          </button>
        </div>
        {previewUrl ? (
          <iframe className={styles.frame} src={previewUrl} title={title || 'kkFileView 预览'} />
        ) : (
          <p className={styles.empty}>无法生成预览地址</p>
        )}
      </div>
    </Modal>
  );
}
