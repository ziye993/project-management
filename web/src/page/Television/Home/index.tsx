import MediaGallery from '@/components/MediaGallery';
import Modal from '@/components/ui/Modal';
import ChunkUploader from '@/components/ChunkUploader';
import { getMovList } from '@/api/media';

export default function TelevisionHome() {
  return (
    <MediaGallery
      type="mov"
      uploadLabel="上传视频"
      previewTitle="播放视频"
      loadList={getMovList}
      renderUploadModal={({ open, onClose, onComplete }) => (
        <Modal open={open} title="切片上传视频" onClose={onClose} onOK={onClose}>
          <ChunkUploader
            accept="video/*,.mp4,.mkv,.avi,.mov,.webm"
            type="mov"
            onComplete={onComplete}
          />
        </Modal>
      )}
    />
  );
}
