import { useRef, useState, type DragEvent } from 'react';
import message from '@/components/ui/Modal/message';
import styles from './ImageUploader.module.less';

export type UploadStatusReporter = (message: string) => void;

interface ImageUploaderProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFile: (file: File, report: UploadStatusReporter) => void | Promise<void>;
}

export default function ImageUploader(props: ImageUploaderProps) {
  const {
    label = '上传图片',
    accept = 'image/*',
    multiple = false,
    disabled = false,
    onFile,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || busy || disabled) return;
    const file = files[0]!;
    setBusy(true);
    setStatus('正在读取图片…');
    const report: UploadStatusReporter = (msg) => setStatus(msg);
    try {
      await Promise.resolve(onFile(file, report));
    } catch {
      message.error('图片处理失败，请重试');
    } finally {
      setBusy(false);
      setStatus('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  const inactive = busy || disabled;

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.zone} ${dragOver ? styles.dragOver : ''} ${inactive ? styles.busy : ''}`}
        onDragOver={(e) => {
          if (inactive) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !inactive && inputRef.current?.click()}
        role="button"
        tabIndex={inactive ? -1 : 0}
        aria-busy={busy}
        onKeyDown={(e) => e.key === 'Enter' && !inactive && inputRef.current?.click()}
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.hint}>
          {busy ? status : '点击或拖拽图片到此处'}
        </span>
        {busy && (
          <div className={styles.busyRow}>
            <span className={styles.spinner} aria-hidden />
            <span className={styles.busyText}>{status || '处理中…'}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className={styles.hidden}
          disabled={inactive}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
