import { useState } from 'react';
import { LoginOutlined } from '@ant-design/icons';
import LoginModal from '@/components/LoginModal';
import { useAuth } from '../../hooks/useAuth';
import styles from './index.module.less';

interface ModuleAuthGateProps {
  moduleKey: string;
  children: React.ReactNode;
}

export default function ModuleAuthGate({ moduleKey, children }: ModuleAuthGateProps) {
  const { loading, canReadModule } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  if (loading) return null;

  if (canReadModule(moduleKey)) {
    return <>{children}</>;
  }

  return (
    <div className={styles.box}>
      <div className={styles.panel}>
        <h2 className={styles.title}>需要登录</h2>
        <p className={styles.desc}>此模块需要登录后才能访问，请先登录账号。</p>
        <button type="button" className={styles.loginBtn} onClick={() => setLoginOpen(true)}>
          <LoginOutlined /> 登录
        </button>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
