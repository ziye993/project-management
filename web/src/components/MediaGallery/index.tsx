import { useEffect, useMemo, useState, type ReactNode } from 'react';
import ToolPageLayout, { shellStyles } from '@/components/ToolPageLayout';
import ListFilterBar, { type FilterValue } from '@/components/ListFilterBar';
import MediaItemCard from '@/components/MediaItemCard';
import LinkCopyModal, { type LinkItem } from '@/components/LinkCopyModal';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { UploadOutlined } from '@ant-design/icons';
import { deleteMedia } from '@/api/media';
import { baseServerIp } from '@/api';
import message from '@/components/ui/Modal/message';
import styles from './index.module.less';

type MediaType = 'pic' | 'mov';

interface MediaGalleryProps {
  type: MediaType;
  uploadLabel: string;
  previewTitle: string;
  loadList: (chatOnly: boolean) => Promise<{ data?: any[] }>;
  renderUploadModal: (props: {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
  }) => ReactNode;
}

const FILTER_FIELDS = [
  { type: 'toggle' as const, key: 'chatOnly', label: '聊天文件' },
  { type: 'search' as const, key: 'name', placeholder: '文件名' },
];

export default function MediaGallery({
  type,
  uploadLabel,
  previewTitle,
  loadList,
  renderUploadModal,
}: MediaGalleryProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList] = useState<Array<Record<string, unknown>>>([]);
  const [preview, setPreview] = useState('');
  const [linkModal, setLinkModal] = useState<{ open: boolean; links: LinkItem[] }>({ open: false, links: [] });
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [filters, setFilters] = useState<FilterValue>({ chatOnly: false, name: '' });

  const chatOnly = Boolean(filters.chatOnly);
  const nameNeedle = String(filters.name || '').trim().toLowerCase();

  const load = async () => {
    const res = await loadList(chatOnly);
    setFileList(res?.data ?? []);
  };

  useEffect(() => {
    void load();
  }, [chatOnly]);

  const displayList = useMemo(() => {
    if (!nameNeedle) return fileList;
    return fileList.filter((item) => {
      const name = String(item.name ?? item.displayName ?? item.originalName ?? '').toLowerCase();
      return name.includes(nameNeedle);
    });
  }, [fileList, nameNeedle]);

  const confirmDelete = async () => {
    if (!deleteTarget?.storedName) return;
    const res = await deleteMedia(type, String(deleteTarget.storedName));
    if (res?.success) {
      message.success('删除成功');
      setDeleteTarget(null);
      await load();
    }
  };

  return (
    <ToolPageLayout
      className={styles.box}
      actions={(
        <>
          <ListFilterBar fields={FILTER_FIELDS} value={filters} onChange={setFilters} />
          <Button onClick={() => setUploadOpen(true)}><UploadOutlined /> {uploadLabel}</Button>
        </>
      )}
    >
      <div className={`${shellStyles.contentPanel} ${styles.content}`}>
        {displayList.map((item) => (
          <MediaItemCard
            key={String(item.storedName)}
            name={String(item.name ?? '')}
            previewUrl={`${baseServerIp}${item.url}`}
            isVideo={type === 'mov'}
            links={(item.links as LinkItem[]) || []}
            onView={() => setPreview(`${baseServerIp}${item.url}`)}
            onCopyLinks={() => setLinkModal({ open: true, links: (item.links as LinkItem[]) || [] })}
            onDelete={() => setDeleteTarget(item)}
          />
        ))}
      </div>

      {renderUploadModal({
        open: uploadOpen,
        onClose: () => setUploadOpen(false),
        onComplete: () => {
          setUploadOpen(false);
          void load();
        },
      })}

      <Modal open={!!preview} title={previewTitle} onClose={() => setPreview('')} onOK={() => setPreview('')} width="80vw">
        {preview && (
          type === 'mov'
            ? <video src={preview} controls className={styles.previewVideo} />
            : <img src={preview} alt="" className={styles.previewImg} />
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="确认删除"
        onClose={() => setDeleteTarget(null)}
        onOK={confirmDelete}
      >
        <p className={styles.deleteTip}>确定删除「{String(deleteTarget?.name ?? '')}」？此操作不可恢复。</p>
      </Modal>

      <LinkCopyModal open={linkModal.open} links={linkModal.links} onClose={() => setLinkModal({ open: false, links: [] })} />
    </ToolPageLayout>
  );
}
