import ToolPageLayout, { shellStyles } from '../../../compomeents/ToolPageLayout';
import ChatFilesFilter from '../../../compomeents/ChatFilesFilter';
import MediaItemCard from '../../../compomeents/MediaItemCard';
import LinkCopyModal, { type LinkItem } from '../../../compomeents/LinkCopyModal';
import Modal from '../../../UiComponents/Modal';
import Upload from '../../../UiComponents/Upload';
import Button from '../../../UiComponents/Button';
import { UploadOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { useEffect, useState } from 'react';
import { deleteMedia, getPicList, uploadPic } from '../../../server/media';
import { baseServerIp } from '../../../server';
import message from '../../../UiComponents/Modal/message';

export default function ImageHome() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [preview, setPreview] = useState('');
  const [linkModal, setLinkModal] = useState<{ open: boolean; links: LinkItem[] }>({ open: false, links: [] });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [chatOnly, setChatOnly] = useState(false);

  const load = async () => {
    const res = await getPicList(chatOnly);
    setFileList(res?.data ?? []);
  };

  useEffect(() => { load(); }, [chatOnly]);

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    await uploadPic(formData);
    message.success('上传成功');
    setUploadOpen(false);
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteMedia('pic', deleteTarget.storedName);
    if (res?.success) {
      message.success('删除成功');
      setDeleteTarget(null);
      await load();
    }
  };

  return (
    <ToolPageLayout
      className={styles.box}
      actions={
        <>
          <ChatFilesFilter checked={chatOnly} onChange={setChatOnly} />
          <Button onClick={() => setUploadOpen(true)}><UploadOutlined /> 上传图片</Button>
        </>
      }
    >
      <div className={`${shellStyles.contentPanel} ${styles.content}`}>
        {fileList.map(item => (
          <MediaItemCard
            key={item.storedName}
            name={item.name}
            previewUrl={`${baseServerIp}${item.url}`}
            links={item.links}
            onView={() => setPreview(`${baseServerIp}${item.url}`)}
            onCopyLinks={() => setLinkModal({ open: true, links: item.links || [] })}
            onDelete={() => setDeleteTarget(item)}
          />
        ))}
      </div>
      <Modal open={uploadOpen} title="上传图片" onClose={() => setUploadOpen(false)} onOK={() => setUploadOpen(false)}>
        <Upload multiple accept="image/*" onChange={handleUpload} />
      </Modal>
      <Modal open={!!preview} title="查看大图" onClose={() => setPreview('')} onOK={() => setPreview('')} width="80vw">
        {preview && <img src={preview} alt="" className={styles.previewImg} />}
      </Modal>
      <Modal
        open={!!deleteTarget}
        title="确认删除"
        onClose={() => setDeleteTarget(null)}
        onOK={confirmDelete}
      >
        <p className={styles.deleteTip}>确定删除「{deleteTarget?.name}」？此操作不可恢复。</p>
      </Modal>
      <LinkCopyModal open={linkModal.open} links={linkModal.links} onClose={() => setLinkModal({ open: false, links: [] })} />
    </ToolPageLayout>
  );
}
