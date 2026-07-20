import { useEffect, useRef, useState } from 'react';
import { CloudUploadOutlined } from '@ant-design/icons';
import { shellStyles } from '@/components/ToolPageLayout';
import Button from '@/components/ui/Button';
import message from '@/components/ui/Modal/message';
import { useNavigate } from '@/Router';
import { useAuth } from '@/hooks/useAuth';
import {
  acquireLock,
  getApp,
  publishVersion,
  suggestVersion,
  type AppStoreApp,
  type AppStoreTempFile,
} from '@/api/appStore';
import ChangelogEditor from '../components/ChangelogEditor';
import PackageUploader from '../components/PackageUploader';
import PublishLockBanner from '../components/PublishLockBanner';
import VersionInputs, {
  versionPartsFromString,
  versionPartsToString,
  type VersionParts,
} from '../components/VersionInputs';
import { APP_STORE_FEATURES } from '../utils/features';
import { LockSession } from '../utils/lockSession';
import { isValidVersion, VERSION_INVALID_MSG } from '../utils/version';
import styles from './index.module.less';

export default function AppStorePublishPage() {
  const { state, push } = useNavigate();
  const appId = String(state?.appId || '');
  const { canWriteModule } = useAuth();
  const canWrite = canWriteModule('appStore');

  const [app, setApp] = useState<AppStoreApp | null>(null);
  const [parts, setParts] = useState<VersionParts>(versionPartsFromString('0.0.0.1'));
  const [title, setTitle] = useState('');
  const [changelog, setChangelog] = useState('');
  const [branch, setBranch] = useState('');
  const [tempFile, setTempFile] = useState<AppStoreTempFile | null>(null);
  const [conflict, setConflict] = useState(false);
  const [conflictUser, setConflictUser] = useState('');
  const [holding, setHolding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const sessionRef = useRef<LockSession | null>(null);

  useEffect(() => {
    if (!appId) {
      message.error('缺少应用信息');
      push('/app-store/apps');
      return;
    }
    if (!canWrite) {
      message.error('当前无写入权限');
      push('/app-store/app', { appId });
      return;
    }

    let cancelled = false;
    const session = new LockSession();
    sessionRef.current = session;

    (async () => {
      try {
        const appRes = await getApp(appId);
        if (cancelled) return;
        setApp(appRes.data?.app || null);

        const lockRes = await acquireLock(appId);
        if (cancelled) return;
        if (lockRes.conflict) {
          setConflict(true);
          setConflictUser(lockRes.username);
          setHolding(false);
          return;
        }

        setConflict(false);
        setHolding(true);
        session.startHeartbeat(appId, lockRes.lockToken, lockRes.lockHeartbeatMs || 20000);

        try {
          const sug = await suggestVersion(appId);
          if (!cancelled && sug.data?.version) {
            setParts(versionPartsFromString(sug.data.version));
          }
        } catch {
          /* keep default */
        }
      } catch {
        if (!cancelled) {
          message.error('进入发布失败');
          push('/app-store/app', { appId });
        }
      }
    })();

    return () => {
      cancelled = true;
      void session.release();
      sessionRef.current = null;
    };
  }, [appId, canWrite, push]);

  const onPublish = async () => {
    const lockToken = sessionRef.current?.token;
    if (!appId || !lockToken) {
      message.error('发布会话已失效，请重新进入发布。');
      return;
    }
    const version = versionPartsToString(parts);
    if (!isValidVersion(version)) {
      message.error(VERSION_INVALID_MSG);
      return;
    }
    if (!tempFile) {
      message.error('请先上传安装包');
      return;
    }

    setPublishing(true);
    try {
      await publishVersion({
        appId,
        lockToken,
        version,
        title: title.trim(),
        changelog: changelog.trim(),
        branch: APP_STORE_FEATURES.branchField ? branch.trim() : '',
        tempFile,
      });
      message.success('发布成功');
      await sessionRef.current?.release();
      sessionRef.current = null;
      push('/app-store/app', { appId });
    } catch {
      /* error toast from client */
    } finally {
      setPublishing(false);
    }
  };

  const disabled = conflict || !holding || publishing;

  return (
    <div className={styles.page}>
      <div className={`${shellStyles.contentPanel} ${styles.panel}`}>
        <h1 className={styles.title}>
          发布新版本
          {app ? <span className={styles.sub}>{app.name}（{app.ownerSlug}/{app.appSlug}）</span> : null}
        </h1>

        <PublishLockBanner conflict={conflict} username={conflictUser} holding={holding} />

        <section className={styles.section}>
          <h2>版本号</h2>
          <VersionInputs value={parts} onChange={setParts} disabled={disabled} />
        </section>

        <section className={styles.section}>
          <h2>标题</h2>
          <input
            className={styles.input}
            value={title}
            placeholder="版本标题（可选）"
            disabled={disabled}
            onChange={(e) => setTitle(e.target.value)}
          />
        </section>

        <section className={styles.section}>
          <h2>更新说明</h2>
          <ChangelogEditor value={changelog} onChange={setChangelog} disabled={disabled} />
        </section>

        {APP_STORE_FEATURES.branchField ? (
          <section className={styles.section}>
            <h2>分支</h2>
            <input
              className={styles.input}
              value={branch}
              placeholder="可选，如 main / release"
              disabled={disabled}
              onChange={(e) => setBranch(e.target.value)}
            />
          </section>
        ) : null}

        <section className={styles.section}>
          <h2>安装包</h2>
          <PackageUploader
            disabled={disabled}
            onUploaded={(file) => setTempFile(file)}
          />
        </section>

        <div className={styles.actions}>
          <Button
            color="primary"
            onClick={() => { if (!disabled) void onPublish(); }}
            style={disabled ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
          >
            <CloudUploadOutlined /> {publishing ? '发布中…' : '确认发布'}
          </Button>
          <Button
            onClick={() => {
              void sessionRef.current?.release();
              push('/app-store/app', { appId });
            }}
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
