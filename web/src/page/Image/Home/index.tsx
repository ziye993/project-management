import UserHeader from '../../../compomeents/UserHeader';
import PageHeader from '../../../compomeents/PageHeader';
import MediaItemCard from '../../../compomeents/MediaItemCard';
import LinkCopyModal, { type LinkItem } from '../../../compomeents/LinkCopyModal';
import Modal from '../../../UiComponents/Modal';
import Upload from '../../../UiComponents/Upload';
import Button from '../../../UiComponents/Button';
import { UploadOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { useEffect, useState } from 'react';
import { getPicList, uploadPic } from '../../../server/media';
import { baseServerIp } from '../../../server';
import message from '../../../UiComponents/Modal/message';

export default function ImageHome() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [preview, setPreview] = useState('');
  const [linkModal, setLinkModal] = useState<{ open: boolean; links: LinkItem[] }>({ open: false, links: [] });

  const load = async () => {
    const res = await getPicList();
    setFileList(res?.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    await uploadPic(formData);
    message.success('上传成功');
    setUploadOpen(false);
    await load();
  };

  return (
    <div className={styles.box}>
      <UserHeader className={styles.userHeader}>
        <PageHeader>
          <Button onClick={() => setUploadOpen(true)}><UploadOutlined /> 上传图片</Button>
        </PageHeader>
      </UserHeader>
      <div className={styles.content}>
        {fileList.map(item => (
          <MediaItemCard
            key={item.storedName}
            name={item.name}
            previewUrl={`${baseServerIp}${item.url}`}
            links={item.links}
            onView={() => setPreview(`${baseServerIp}${item.url}`)}
            onCopyLinks={() => setLinkModal({ open: true, links: item.links || [] })}
          />
        ))}
      </div>
      <Modal open={uploadOpen} title="上传图片" onClose={() => setUploadOpen(false)} onOK={() => setUploadOpen(false)}>
        <Upload multiple accept="image/*" onChange={handleUpload} />
      </Modal>
      <Modal open={!!preview} title="查看大图" onClose={() => setPreview('')} onOK={() => setPreview('')} width="80vw">
        {preview && <img src={preview} alt="" className={styles.previewImg} />}
      </Modal>
      <LinkCopyModal open={linkModal.open} links={linkModal.links} onClose={() => setLinkModal({ open: false, links: [] })} />
    </div>
  );
}
