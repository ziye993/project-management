import { useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { chunkInit, chunkMerge, chunkUpload } from '../../server/media';
import message from '../../UiComponents/Modal/message';
import styles from './index.module.less';

const CHUNK_SIZE = 2 * 1024 * 1024;

interface ChunkUploaderProps {
  accept?: string;
  type?: string;
  onComplete: () => void;
}

export default function ChunkUploader(props: ChunkUploaderProps) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || uploading) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const initRes = await chunkInit(file.name, totalChunks, props.type || 'mov');
        const uploadId = initRes.data.uploadId;
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const blob = file.slice(start, start + CHUNK_SIZE);
          await chunkUpload(uploadId, i, blob);
          setProgress(Math.round(((i + 1) / totalChunks) * 100));
        }
        await chunkMerge(uploadId);
      }
      message.success('上传完成');
      props.onComplete();
    } catch (e: any) {
      message.error(e?.message || '上传失败');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={styles.box}>
      <div className={`${styles.uploadBox} ${uploading ? styles.disabled : ''}`}>
        <PlusOutlined />
        <span>{uploading ? `上传中 ${progress}%` : '选择视频文件'}</span>
        <input
          ref={inputRef}
          type="file"
          accept={props.accept || 'video/*'}
          multiple
          disabled={uploading}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
      {uploading && (
        <>
          <div className={styles.progressBar}><div style={{ width: `${progress}%` }} /></div>
          <p className={styles.progressText}>切片上传中，请勿关闭窗口</p>
        </>
      )}
    </div>
  );
}
