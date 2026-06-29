import { useState } from 'react';
import Modal from '../../UiComponents/Modal';
import message from '../../UiComponents/Modal/message';
import { useAuth } from '../../hooks/useAuth';
import { login } from '../../server/user';
import { resolveEffectiveLogApiBaseUrl } from '../../utils/logApiBase';
import styles from './index.module.less';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { logApiBaseUrl, refresh } = useAuth();
  const apiBase = resolveEffectiveLogApiBaseUrl(logApiBaseUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      message.error('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    try {
      await login(apiBase, username.trim(), password);
      message.success('已登录，可刷新页面使全部功能生效');
      await refresh();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg && !msg.startsWith('请求失败')) {
        message.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="登录" onClose={onClose} onOK={handleSubmit} width={400}>
      <div className={styles.form}>
        <label className={styles.field}>
          <span>用户名</span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className={styles.field}>
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </label>
        {submitting ? <p className={styles.hint}>登录中…</p> : null}
      </div>
    </Modal>
  );
}
