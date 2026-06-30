import ToolPageLayout, { shellStyles } from '../../../compomeents/ToolPageLayout';
import Button from '../../../UiComponents/Button';
import { ReloadOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { useEffect, useState } from 'react';
import { getServerStatus } from '../../../server/system';

function formatBytes(n: number) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function ServerInfoHome() {
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const res = await getServerStatus();
    setData(res.data);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!data) {
    return (
      <ToolPageLayout className={styles.box}>
        <p className={styles.loading}>加载中...</p>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout
      className={styles.box}
      actions={<Button onClick={load}><ReloadOutlined /> 刷新</Button>}
    >
      <div className={styles.content}>
        <section className={`${shellStyles.panel} ${styles.card}`}>
          <h3>实时状态</h3>
          <p>CPU 占用：{data.current?.cpu ?? 0}%（{data.cpuCount} 核）</p>
          <p>内存占用：{data.current?.memPercent ?? 0}%（{formatBytes(data.current?.memUsed)} / {formatBytes(data.current?.memTotal)}）</p>
          <p>运行时长：{data.uptimeText}</p>
        </section>
        <section className={`${shellStyles.panel} ${styles.card}`}>
          <h3>本次启动以来平均</h3>
          <p>平均 CPU：{data.average?.cpu ?? 0}%</p>
          <p>平均内存：{data.average?.memPercent ?? 0}%</p>
          <p>采样次数：{data.sampleCount}</p>
        </section>
        <section className={`${shellStyles.panel} ${styles.card}`}>
          <h3>系统信息</h3>
          <p>主机名：{data.hostname}</p>
          <p>平台：{data.platform} / {data.arch}</p>
          <p>CPU：{data.cpuModel}</p>
          <p>Node：{data.nodeVersion} | PID：{data.pid}</p>
        </section>
        <section className={`${shellStyles.panel} ${styles.card}`}>
          <h3>磁盘空间</h3>
          {(data.disks || []).map((d: any) => (
            <p key={d.path}>{d.path}：已用 {d.usedPercent}%（{formatBytes(d.used)} / {formatBytes(d.total)}）</p>
          ))}
          {!data.disks?.length && <p>暂无磁盘数据</p>}
        </section>
      </div>
    </ToolPageLayout>
  );
}
