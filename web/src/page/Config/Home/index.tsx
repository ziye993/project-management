import UserHeader from '../../../compomeents/UserHeader'
import PageShell, { shellStyles } from '../../../compomeents/PageShell';
import styles from './index.module.less'
import FileSelect, { type FileSelectResult } from '../../../compomeents/FileSelect';
import { useEffect, useRef, useState } from 'react';
import message from '../../../UiComponents/Modal/message';
import {
  getConfig,
  setFileUploadPath,
  setMovUploadPath,
  setPicUploadPath,
  setPublicBaseUrl,
} from '../../../server/setConfig';
import PageHeader from "../../../compomeents/PageHeader";

type ConfigState = {
  picUploadPath?: string;
  movUploadPath?: string;
  fileUploadPath?: string;
  publicBaseUrl?: string;
  filesRoot?: string;
};

export default function ConfigHome() {
  const [selectFileOpen, setSelectFileOpen] = useState(false);
  const [config, setConfigState] = useState<ConfigState>({});
  const [publicUrl, setPublicUrl] = useState('');
  const apiFun = useRef<(param: { uploadPath: string }) => Promise<any>>(async () => ({}));
  const filesRoot = config.filesRoot;

  const loadConfig = async () => {
    const res = await getConfig();
    if (res?.data) {
      setConfigState(res.data);
      setPublicUrl(res.data.publicBaseUrl || '');
    }
  };

  const onOK = async (pathInfo: FileSelectResult | null) => {
    setSelectFileOpen(false);
    if (!pathInfo?.path) {
      message.info("请选择文件夹");
      return;
    }
    const res = await apiFun.current({ uploadPath: pathInfo.path });
    if (!res?.success) return;
    message.success('路径已更新');
    await loadConfig();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const displayPath = (p?: string) => p || '未设置';

  return (
    <PageShell className={styles.box}>
      <UserHeader className={shellStyles.userHeader}>
        <PageHeader />
      </UserHeader>

      <FileSelect
        open={selectFileOpen}
        mode="directory"
        title="选择存储文件夹"
        initialAbsPath={filesRoot}
        onClose={() => setSelectFileOpen(false)}
        onOK={onOK}
      />
      <div className={styles.content}>
        <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
          <span className={styles.configItemTitle}>上传路径</span>
          <p className={styles.hint}>默认使用项目 data/files 目录，可按需修改</p>
          <div className={styles.configItemContent}>
            <ul>
              <li onClick={() => { setSelectFileOpen(true); apiFun.current = setPicUploadPath }}>
                <span>照片上传路径</span>
                <span className={styles.value} title={config.picUploadPath}>{displayPath(config.picUploadPath)}</span>
              </li>
              <li onClick={() => { setSelectFileOpen(true); apiFun.current = setMovUploadPath }}>
                <span>影视上传路径</span>
                <span className={styles.value} title={config.movUploadPath}>{displayPath(config.movUploadPath)}</span>
              </li>
              <li onClick={() => { setSelectFileOpen(true); apiFun.current = setFileUploadPath }}>
                <span>文件上传路径</span>
                <span className={styles.value} title={config.fileUploadPath}>{displayPath(config.fileUploadPath)}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
          <span className={styles.configItemTitle}>访问链接</span>
          <p className={styles.hint}>配置公网域名后，图片/视频链接会额外生成线上地址（如 https://example.com）</p>
          <div className={styles.publicUrlRow}>
            <input
              className={styles.input}
              value={publicUrl}
              onChange={e => setPublicUrl(e.target.value)}
              placeholder="https://your-domain.com"
            />
            <button
              type="button"
              className={styles.saveBtn}
              onClick={async () => {
                await setPublicBaseUrl({ publicBaseUrl: publicUrl });
                message.success('已保存');
                loadConfig();
              }}
            >保存</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
