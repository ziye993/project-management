import { useState } from 'react';
import { PoweroffOutlined } from '@ant-design/icons';
import Modal from '@/components/ui/Modal';
import { shutdownServer } from '@/api/system';
import styles from './index.module.less';

export default function ShutdownButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const closePage = () => {
    try {
      window.close();
    } catch {
      // ignore
    }
    document.open();
    document.write(
      '<html><head><title>服务已关闭</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#64748b;background:#f8fafc"><p>服务已关闭，可以关闭此页面</p></body></html>',
    );
    document.close();
  };

  const handleShutdown = async () => {
    setLoading(true);
    try {
      await shutdownServer();
    } catch {
      // 服务端可能已开始关闭，仍尝试关闭页面
    }
    setOpen(false);
    closePage();
  };

  return (
    <>
      <button type="button" className={styles.btn} onClick={() => setOpen(true)} title="关闭服务">
        <PoweroffOutlined /> 关闭
      </button>
      <Modal
        open={open}
        title="确认关闭服务"
        onClose={() => { if (!loading) setOpen(false); }}
        onOK={handleShutdown}
      >
        <p className={styles.tip}>
          确认后将停止所有正在运行的项目进程，并关闭本地服务。此操作不可撤销。
        </p>
      </Modal>
    </>
  );
}
