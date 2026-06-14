import UserHeader from '../../../compomeents/UserHeader';
import PageHeader from '../../../compomeents/PageHeader';
import MediaItemCard from '../../../compomeents/MediaItemCard';
import LinkCopyModal, { type LinkItem } from '../../../compomeents/LinkCopyModal';
import ChunkUploader from '../../../compomeents/ChunkUploader';
import Modal from '../../../UiComponents/Modal';
import Button from '../../../UiComponents/Button';
import { UploadOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { useEffect, useState } from 'react';
import { getMovList } from '../../../server/media';
import { baseServerIp } from '../../../server';

export default function TelevisionHome() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [preview, setPreview] = useState('');
  const [linkModal, setLinkModal] = useState<{ open: boolean; links: LinkItem[] }>({ open: false, links: [] });

  const load = async () => {
    const res = await getMovList();
    setFileList(res?.data ?? []);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className={styles.box}>
      <UserHeader className={styles.userHeader}>
        <PageHeader>
          <Button onClick={() => setUploadOpen(true)}><UploadOutlined /> 上传视频</Button>
        </PageHeader>
      </UserHeader>
      <div className={styles.content}>
        {fileList.map(item => (
          <MediaItemCard
            key={item.storedName}
            name={item.name}
            previewUrl={`${baseServerIp}${item.url}`}
            isVideo
            links={item.links}
            onView={() => setPreview(`${baseServerIp}${item.url}`)}
            onCopyLinks={() => setLinkModal({ open: true, links: item.links || [] })}
          />
        ))}
      </div>
      <Modal open={uploadOpen} title="切片上传视频" onClose={() => setUploadOpen(false)} onOK={() => setUploadOpen(false)}>
        <ChunkUploader accept="video/*,.mp4,.mkv,.avi,.mov,.webm" type="mov" onComplete={() => { setUploadOpen(false); load(); }} />
      </Modal>
      <Modal open={!!preview} title="播放视频" onClose={() => setPreview('')} onOK={() => setPreview('')} width="80vw">
        {preview && <video src={preview} controls className={styles.previewVideo} />}
      </Modal>
      <LinkCopyModal open={linkModal.open} links={linkModal.links} onClose={() => setLinkModal({ open: false, links: [] })} />
    </div>
  );
}
