import MediaGallery from '@/components/MediaGallery';
import Modal from '@/components/ui/Modal';
import Upload from '@/components/ui/Upload';
import { getPicList, uploadPic } from '@/api/media';
import message from '@/components/ui/Modal/message';

export default function ImageHome() {
  return (
    <MediaGallery
      type="pic"
      uploadLabel="上传图片"
      previewTitle="查看大图"
      loadList={getPicList}
      renderUploadModal={({ open, onClose, onComplete }) => (
        <Modal open={open} title="上传图片" onClose={onClose} onOK={onClose}>
          <Upload
            multiple
            accept="image/*"
            onChange={async (files: File[]) => {
              if (!files.length) return;
              const formData = new FormData();
              files.forEach((file: File) => formData.append('files', file));
              await uploadPic(formData);
              message.success('上传成功');
              onComplete();
            }}
          />
        </Modal>
      )}
    />
  );
}
