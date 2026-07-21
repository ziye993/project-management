import { useEffect, useMemo, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import Button from '@/components/ui/Button';
import message from '@/components/ui/Modal/message';
import type { AppStoreApp } from '@/api/appStore';
import {
  DOWNLOAD_SHELL_OPTIONS,
  buildDownloadCommand,
  suggestDownloadFilename,
  type DownloadShellId,
} from '../utils/downloadCommands';
import styles from './components.module.less';

interface DownloadCommandPanelProps {
  app: AppStoreApp;
  /** Latest published package originalName, if any */
  latestFileName?: string | null;
}

export default function DownloadCommandPanel(props: DownloadCommandPanelProps) {
  const { app, latestFileName } = props;
  const links = app.updateLinks?.length
    ? app.updateLinks
    : app.updateUrl
      ? [{ type: 'default', label: '更新链接', url: app.updateUrl }]
      : [];

  const [shell, setShell] = useState<DownloadShellId>('linux-curl');
  const [linkUrl, setLinkUrl] = useState(() => {
    const preferred = links.find((l) => l.type === 'public') || links[0];
    return preferred?.url || '';
  });
  const [filename, setFilename] = useState(() =>
    suggestDownloadFilename({ appSlug: app.appSlug, originalName: latestFileName }),
  );
  const [filenameTouched, setFilenameTouched] = useState(false);

  useEffect(() => {
    if (filenameTouched) return;
    setFilename(suggestDownloadFilename({
      appSlug: app.appSlug,
      originalName: latestFileName,
    }));
  }, [app.appSlug, latestFileName, filenameTouched]);

  const effectiveUrl = useMemo(() => {
    if (linkUrl && links.some((l) => l.url === linkUrl)) return linkUrl;
    const preferred = links.find((l) => l.type === 'public') || links[0];
    return preferred?.url || '';
  }, [linkUrl, links]);

  const command = useMemo(
    () => buildDownloadCommand({ shell, url: effectiveUrl, filename }),
    [shell, effectiveUrl, filename],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof DOWNLOAD_SHELL_OPTIONS>();
    for (const opt of DOWNLOAD_SHELL_OPTIONS) {
      const list = map.get(opt.group) || [];
      list.push(opt);
      map.set(opt.group, list);
    }
    return [...map.entries()];
  }, []);

  const copyCommand = async () => {
    if (!command) {
      message.error('暂无可用链接');
      return;
    }
    try {
      await navigator.clipboard.writeText(command);
      message.success('下载指令已复制');
    } catch {
      message.error('复制失败');
    }
  };

  if (!links.length) {
    return (
      <div className={styles.downloadPanel}>
        <h3 className={styles.downloadTitle}>客户端下载指令</h3>
        <p className={styles.downloadHint}>暂无更新链接（请先配置公网地址或使用本机/局域网链接）</p>
      </div>
    );
  }

  return (
    <div className={styles.downloadPanel}>
      <h3 className={styles.downloadTitle}>客户端下载指令</h3>
      <p className={styles.downloadHint}>
        选择目标系统与链接，生成可直接粘贴到终端 / CMD / PowerShell 的拉取命令（始终下载最新已发布包）。
      </p>

      <div className={styles.downloadControls}>
        <label className={styles.downloadField}>
          <span>目标链接</span>
          <select
            value={effectiveUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          >
            {links.map((link) => (
              <option key={`${link.type}-${link.url}`} value={link.url}>
                {link.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.downloadField}>
          <span>客户端系统</span>
          <select
            value={shell}
            onChange={(e) => setShell(e.target.value as DownloadShellId)}
          >
            {groups.map(([group, opts]) => (
              <optgroup key={group} label={group}>
                {opts.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {group} · {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className={styles.downloadField}>
          <span>保存文件名</span>
          <input
            type="text"
            value={filename}
            placeholder={app.appSlug || 'package'}
            onChange={(e) => {
              setFilenameTouched(true);
              setFilename(e.target.value);
            }}
          />
        </label>
      </div>

      <div className={styles.downloadCmdRow}>
        <pre className={styles.downloadCmd}>{command || '—'}</pre>
        <Button color="primary" onClick={() => void copyCommand()}>
          <CopyOutlined /> 复制指令
        </Button>
      </div>
    </div>
  );
}
