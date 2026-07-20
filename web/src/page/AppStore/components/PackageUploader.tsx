import { useRef, useState, type DragEvent } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { chunkInit, chunkMerge, chunkUpload } from '@/api/media';
import type { AppStoreTempFile } from '@/api/appStore';
import message from '@/components/ui/Modal/message';
import uploadStyles from '@/components/ChunkUploader/index.module.less';
import styles from './components.module.less';

const CHUNK_SIZE = 2 * 1024 * 1024;
const MAX_BYTES = 2147483648; // 2GB

interface PackageUploaderProps {
  disabled?: boolean;
  onUploaded: (tempFile: AppStoreTempFile) => void;
}

export default function PackageUploader(props: PackageUploaderProps) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (files: FileList | null) => {
    if (!files?.length || uploading || props.disabled) return;
    const file = files[0];
    if (file.size > MAX_BYTES) {
      message.error('文件超过 2GB 上限。');
      return;
    }

    setUploading(true);
    setFileName(file.name);
    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1;
      const initRes = await chunkInit(file.name, totalChunks, 'file');
      const uploadId = initRes.data.uploadId;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const blob = file.slice(start, start + CHUNK_SIZE);
        await chunkUpload(uploadId, i, blob);
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      const mergeRes = await chunkMerge(uploadId);
      const data = mergeRes.data || {};
      const storedName = String(data.storedName || '');
      if (!storedName) {
        throw new Error('合并结果缺少 storedName');
      }
      const tempFile: AppStoreTempFile = {
        storedName,
        // flat under fileUploadPath — relativePath may equal storedName
        relativePath: storedName,
        originalName: String(data.originalName || file.name),
        size: Number(data.size) || file.size,
        mime: file.type || 'application/octet-stream',
      };
      message.success('上传完成');
      props.onUploaded(tempFile);
    } catch (e: any) {
      message.error(e?.message || '上传失败');
      setFileName('');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (uploading || props.disabled) return;
    void handleFile(e.dataTransfer.files);
  };

  return (
    <div className={styles.packageUploader}>
      <div
        className={`${uploadStyles.uploadBox} ${uploading || props.disabled ? uploadStyles.disabled : ''} ${dragOver ? uploadStyles.dragOver : ''}`}
        onClick={() => !uploading && !props.disabled && inputRef.current?.click()}
        onDragEnter={(e) => {
          if (uploading || props.disabled) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          if (uploading || props.disabled) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={onDrop}
      >
        <PlusOutlined />
        <span>
          {uploading
            ? `上传中 ${progress}%`
            : dragOver
              ? '松开以上传安装包'
              : fileName
                ? `已上传：${fileName}（可重新选择）`
                : '点击或拖拽安装包到此处（单文件，最大 2GB）'}
        </span>
        <input
          ref={inputRef}
          type="file"
          disabled={uploading || props.disabled}
          className={uploadStyles.hiddenInput}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleFile(e.target.files)}
        />
      </div>
      {uploading && (
        <>
          <div className={uploadStyles.progressBar}><div style={{ width: `${progress}%` }} /></div>
          <p className={uploadStyles.progressText}>切片上传中，请勿关闭窗口</p>
        </>
      )}
    </div>
  );
}
