import ToolPageLayout, { shellStyles } from '@/components/ToolPageLayout';
import ChatFilesFilter from '@/components/ChatFilesFilter';
import LinkCopyModal, { type LinkItem } from '@/components/LinkCopyModal';
import Button from '@/components/ui/Button';
import { FolderAddOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined, LinkOutlined, EyeOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { createShareFolder, deleteShareItem, getShareList, uploadShareFiles } from '@/api/share';
import message from '@/components/ui/Modal/message';
import KkFileViewPreviewModal from '../components/KkFileViewPreviewModal';
import { buildKkFileViewPreviewUrl, pickFileAccessUrl } from '@/utils/kkFileView';

export default function LANSharingHome() {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [chatOnly, setChatOnly] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [linkModal, setLinkModal] = useState<{ open: boolean; links: LinkItem[] }>({ open: false, links: [] });
  const [preview, setPreview] = useState<{ open: boolean; name: string; url: string }>({
    open: false,
    name: '',
    url: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (path = currentPath) => {
    const res = await getShareList(chatOnly ? 'chat' : path, chatOnly);
    setItems(res.data?.items || []);
    setCurrentPath(res.data?.currentPath || '');
  };

  useEffect(() => {
    if (!chatOnly) setCurrentPath('');
    load('');
  }, [chatOnly]);

  const enter = (item: any) => {
    if (chatOnly || !item.isDirectory) return;
    load(item.relativePath);
  };

  const goUp = () => {
    if (chatOnly || !currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    load(parts.join('/'));
  };

  const mkdir = async () => {
    const name = prompt('新建文件夹名称');
    if (!name) return;
    await createShareFolder(currentPath, name);
    message.success('创建成功');
    load();
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || chatOnly) return;
    await uploadShareFiles(currentPath, Array.from(files));
    message.success('上传成功');
    load();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (chatOnly) return;
    void upload(e.dataTransfer.files);
  };

  const remove = async (item: any) => {
    if (!confirm(`确定删除 ${item.name}？`)) return;
    await deleteShareItem(item.relativePath);
    message.success('已删除');
    load();
  };

  const download = (item: any) => {
    const url = item.downloadLinks?.[0]?.url;
    if (url) window.open(url, '_blank');
  };

  const openKkFileViewPreview = (item: any) => {
    const fileUrl = pickFileAccessUrl(item.downloadLinks);
    if (!fileUrl) {
      message.error('缺少可访问的文件地址，无法预览');
      return;
    }
    setPreview({
      open: true,
      name: item.name,
      url: buildKkFileViewPreviewUrl(fileUrl),
    });
  };

  const pathLabel = chatOnly ? '/chat（聊天文件）' : `/${currentPath}`;

  return (
    <ToolPageLayout
      className={styles.box}
      actions={
        <>
          <ChatFilesFilter checked={chatOnly} onChange={setChatOnly} />
          {!chatOnly && <Button onClick={goUp}>上级</Button>}
          {!chatOnly && <Button onClick={mkdir}><FolderAddOutlined /> 新建文件夹</Button>}
          {!chatOnly && <Button onClick={() => fileRef.current?.click()}><UploadOutlined /> 上传文件</Button>}
        </>
      }
    >
      <div
        className={`${shellStyles.contentPanel} ${styles.main} ${dragOver ? styles.dragOver : ''}`}
        onDragEnter={(e) => {
          if (chatOnly) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          if (chatOnly) return;
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
        <p className={styles.path}>
          当前路径：{pathLabel}
          {!chatOnly && <span className={styles.dropHint}>{dragOver ? '松开以上传到此目录' : '可拖拽文件到此处上传'}</span>}
        </p>
        <input ref={fileRef} type="file" multiple hidden onChange={e => upload(e.target.files)} />
        <div className={styles.list}>
          {items.length === 0 && (
            <p className={styles.empty}>
              {chatOnly ? '暂无聊天文件' : dragOver ? '松开鼠标上传文件' : '此目录为空，可拖拽文件到此处上传'}
            </p>
          )}
          {items.map(item => (
            <div key={item.relativePath} className={styles.row}>
              <span className={styles.name} onClick={() => enter(item)}>{item.isDirectory ? '📁' : '📄'} {item.name}</span>
              <div className={styles.actions}>
                {!item.isDirectory && (
                  <>
                    <button type="button" onClick={() => openKkFileViewPreview(item)}>
                      <EyeOutlined /> 使用kkFileView预览
                    </button>
                    <button type="button" onClick={() => download(item)}><DownloadOutlined /> 下载</button>
                    <button type="button" onClick={() => setLinkModal({ open: true, links: item.downloadLinks || [] })}><LinkOutlined /> 链接</button>
                  </>
                )}
                <button type="button" className={styles.dangerBtn} onClick={() => remove(item)}><DeleteOutlined /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <LinkCopyModal open={linkModal.open} links={linkModal.links} onClose={() => setLinkModal({ open: false, links: [] })} />
      <KkFileViewPreviewModal
        open={preview.open}
        title={`预览：${preview.name}`}
        previewUrl={preview.url}
        onClose={() => setPreview({ open: false, name: '', url: '' })}
      />
    </ToolPageLayout>
  );
}
