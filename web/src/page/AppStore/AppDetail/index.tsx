import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyOutlined, DownloadOutlined, EditOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { shellStyles } from '@/components/ToolPageLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { useNavigate } from '@/Router';
import { useAuth } from '@/hooks/useAuth';
import {
  getApp,
  listVersions,
  updateVersionMeta,
  yankVersion,
  type AppStoreApp,
  type AppStoreVersion,
} from '@/api/appStore';
import DownloadCommandPanel from '../components/DownloadCommandPanel';
import { APP_STORE_FEATURES, packageStaticUrl } from '../utils/features';
import { compareVersions } from '../utils/version';
import styles from './index.module.less';

function formatSize(size?: number) {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function versionDownloadUrl(app: AppStoreApp | null, ver: AppStoreVersion): string {
  if (ver.file?.relativePath) {
    return packageStaticUrl(ver.file.relativePath);
  }
  if (app?.latestVersion === ver.version && app.updateUrl) {
    return app.updateUrl;
  }
  return app?.updateLinks?.[0]?.url || app?.updateUrl || '';
}

export default function AppStoreAppDetailPage() {
  const { state, push } = useNavigate();
  const appId = String(state?.appId || '');
  const { canWriteModule } = useAuth();
  const canWrite = canWriteModule('appStore');
  const pushRef = useRef(push);
  pushRef.current = push;

  const [app, setApp] = useState<AppStoreApp | null>(null);
  const [versions, setVersions] = useState<AppStoreVersion[]>([]);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AppStoreVersion | null>(null);
  const [editForm, setEditForm] = useState({ title: '', changelog: '' });

  const load = useCallback(async () => {
    if (!appId) return;
    const [appRes, verRes] = await Promise.all([getApp(appId), listVersions(appId)]);
    setApp(appRes.data?.app || null);
    const list = [...(verRes.data?.versions || [])].sort((a, b) => compareVersions(b, a));
    setVersions(list);
    setLatestVersion(verRes.data?.latestVersion ?? null);
  }, [appId]);

  useEffect(() => {
    if (!appId) {
      message.error('缺少应用信息');
      pushRef.current('/app-store/apps');
      return;
    }
    void load();
  }, [appId, load]);

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  const openEdit = (ver: AppStoreVersion) => {
    setEditTarget(ver);
    setEditForm({ title: ver.title || '', changelog: ver.changelog || '' });
  };

  const saveMeta = async () => {
    if (!editTarget || !appId) return;
    await updateVersionMeta({
      appId,
      version: editTarget.version,
      title: editForm.title,
      changelog: editForm.changelog,
    });
    message.success('已更新');
    setEditTarget(null);
    await load();
  };

  const onYank = async (ver: AppStoreVersion) => {
    if (!canWrite || !APP_STORE_FEATURES.yankVersion) return;
    if (!confirm(`确定下架版本 ${ver.version}？`)) return;
    await yankVersion(appId, ver.version);
    message.success('已下架');
    await load();
  };

  if (!app) {
    return <p className={styles.empty}>加载中…</p>;
  }

  const updateUrl = app.updateUrl || app.updateLinks?.[0]?.url || '';
  const latestFileName = versions.find(
    (v) => v.version === latestVersion && v.status === 'published',
  )?.file?.originalName || null;

  return (
    <div className={styles.page}>
      <div className={`${shellStyles.contentPanel} ${styles.header}`}>
        <div className={styles.cover}>
          {app.coverPath ? (
            <img src={app.coverPath} alt="" />
          ) : (
            <span>{app.name?.slice(0, 1) || 'A'}</span>
          )}
        </div>
        <div className={styles.headerBody}>
          <h1 className={styles.title}>{app.name}</h1>
          <p className={styles.slug}>{app.ownerSlug}/{app.appSlug}</p>
          <p className={styles.desc}>{app.description || '暂无简介'}</p>
          <div className={styles.linkRow}>
            <span className={styles.linkLabel}>更新链接</span>
            <code className={styles.linkUrl}>{updateUrl || '-'}</code>
            {updateUrl ? (
              <Button onClick={() => copyText(updateUrl)}><CopyOutlined /> 复制链接</Button>
            ) : null}
          </div>
          {app.updateLinks && app.updateLinks.length > 1 ? (
            <div className={styles.linksExtra}>
              {app.updateLinks.map((link) => (
                <button
                  key={`${link.type}-${link.url}`}
                  type="button"
                  className={styles.linkChip}
                  onClick={() => copyText(link.url)}
                  title={link.url}
                >
                  {link.label}
                </button>
              ))}
            </div>
          ) : null}
          <DownloadCommandPanel app={app} latestFileName={latestFileName} />
          <div className={styles.headerActions}>
            {canWrite ? (
              <Button
                color="primary"
                onClick={() => push('/app-store/publish', { appId: app.id })}
              >
                <CloudUploadOutlined /> 发布新版本
              </Button>
            ) : null}
            <Button onClick={() => push('/app-store/apps')}>返回列表</Button>
          </div>
        </div>
      </div>

      <div className={`${shellStyles.contentPanel} ${styles.versions}`}>
        <h2 className={styles.sectionTitle}>
          版本列表
          {latestVersion ? <span className={styles.latestTag}>最新 {latestVersion}</span> : null}
        </h2>
        {!versions.length ? (
          <p className={styles.empty}>暂无版本</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>版本</th>
                  <th>标题</th>
                  <th>文件</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((ver) => {
                  const dl = versionDownloadUrl(app, ver);
                  const isLatest = ver.version === latestVersion && ver.status === 'published';
                  return (
                    <tr key={ver.version}>
                      <td>
                        <code>{ver.version}</code>
                        {isLatest ? <span className={styles.badge}>latest</span> : null}
                      </td>
                      <td>{ver.title || '-'}</td>
                      <td>
                        <div className={styles.fileCell}>
                          <span>{ver.file?.originalName || '-'}</span>
                          <span className={styles.muted}>{formatSize(ver.file?.size)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={ver.status === 'yanked' ? styles.statusYanked : styles.statusOk}>
                          {ver.status === 'yanked' ? '已下架' : '已发布'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          {ver.status === 'published' && dl ? (
                            <button type="button" onClick={() => window.open(isLatest && updateUrl ? updateUrl : dl, '_blank')}>
                              <DownloadOutlined /> 下载
                            </button>
                          ) : null}
                          {canWrite ? (
                            <button type="button" onClick={() => openEdit(ver)}>
                              <EditOutlined /> 编辑
                            </button>
                          ) : null}
                          {canWrite && APP_STORE_FEATURES.yankVersion && ver.status === 'published' ? (
                            <button type="button" className={styles.danger} onClick={() => void onYank(ver)}>
                              下架
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!editTarget}
        title={`编辑 ${editTarget?.version || ''}`}
        width="480px"
        onClose={() => setEditTarget(null)}
        onOK={() => void saveMeta()}
      >
        <div className={styles.editForm}>
          <label>
            <span>标题</span>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </label>
          <label>
            <span>更新说明</span>
            <textarea
              rows={5}
              value={editForm.changelog}
              onChange={(e) => setEditForm({ ...editForm, changelog: e.target.value })}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
