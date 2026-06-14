import UserHeader from '../../../compomeents/UserHeader';
import PageHeader from '../../../compomeents/PageHeader';
import LinkCopyModal, { type LinkItem } from '../../../compomeents/LinkCopyModal';
import Button from '../../../UiComponents/Button';
import { FolderAddOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { useEffect, useRef, useState } from 'react';
import { createShareFolder, deleteShareItem, getShareList, uploadShareFiles } from '../../../server/share';
import message from '../../../UiComponents/Modal/message';

export default function LANSharingHome() {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [linkModal, setLinkModal] = useState<{ open: boolean; links: LinkItem[] }>({ open: false, links: [] });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (path = currentPath) => {
    const res = await getShareList(path);
    setItems(res.data?.items || []);
    setCurrentPath(res.data?.currentPath || '');
  };

  useEffect(() => { load(''); }, []);

  const enter = (item: any) => {
    if (item.isDirectory) load(item.relativePath);
  };

  const goUp = () => {
    if (!currentPath) return;
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
    if (!files?.length) return;
    await uploadShareFiles(currentPath, Array.from(files));
    message.success('上传成功');
    load();
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

  return (
    <div className={styles.box}>
      <UserHeader className={styles.userHeader}>
        <PageHeader>
          <Button onClick={goUp}>上级</Button>
          <Button onClick={mkdir}><FolderAddOutlined /> 新建文件夹</Button>
          <Button onClick={() => fileRef.current?.click()}><UploadOutlined /> 上传文件</Button>
        </PageHeader>
      </UserHeader>
      <p className={styles.path}>当前：/{currentPath}</p>
      <input ref={fileRef} type="file" multiple hidden onChange={e => upload(e.target.files)} />
      <div className={styles.list}>
        {items.map(item => (
          <div key={item.relativePath} className={styles.row}>
            <span className={styles.name} onClick={() => enter(item)}>{item.isDirectory ? '📁' : '📄'} {item.name}</span>
            <div className={styles.actions}>
              {!item.isDirectory && (
                <>
                  <button type="button" onClick={() => download(item)}><DownloadOutlined /> 下载</button>
                  <button type="button" onClick={() => setLinkModal({ open: true, links: item.downloadLinks || [] })}><LinkOutlined /> 链接</button>
                </>
              )}
              <button type="button" onClick={() => remove(item)}><DeleteOutlined /></button>
            </div>
          </div>
        ))}
      </div>
      <LinkCopyModal open={linkModal.open} links={linkModal.links} onClose={() => setLinkModal({ open: false, links: [] })} />
    </div>
  );
}
