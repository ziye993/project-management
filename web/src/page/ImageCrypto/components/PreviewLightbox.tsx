import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CloseOutlined } from '@ant-design/icons';
import styles from './PreviewLightbox.module.less';

interface PreviewLightboxProps {
  open: boolean;
  title: string;
  lightUrl: string;
  darkUrl: string;
  meta?: string;
  onClose: () => void;
}

export default function PreviewLightbox(props: PreviewLightboxProps) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const root = document.getElementById('modalRoot');
  if (!root) return null;

  return ReactDOM.createPortal(
    <div
      className={styles.overlay}
      onClick={props.onClose}
      role="presentation"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h3 className={styles.title}>{props.title}</h3>
          <button type="button" className={styles.closeBtn} onClick={props.onClose} aria-label="关闭">
            <CloseOutlined />
          </button>
        </header>
        {props.meta && <p className={styles.meta}>{props.meta}</p>}
        <div className={styles.compare}>
          <figure>
            <div className={styles.frame} data-bg="light">
              <img src={props.lightUrl} alt="浅底显形" />
            </div>
            <figcaption>浅底显形</figcaption>
          </figure>
          <figure>
            <div className={styles.frame} data-bg="dark">
              <img src={props.darkUrl} alt="深底显形" />
            </div>
            <figcaption>深底显形</figcaption>
          </figure>
        </div>
        <p className={styles.hint}>点击遮罩或按 Esc 关闭 · 内容过高时可滚动查看</p>
      </div>
    </div>,
    root,
  );
}
