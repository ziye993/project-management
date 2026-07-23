import { useMemo, useState } from 'react';
import { LoginOutlined } from '@ant-design/icons';
import { useRouterIds } from '../../../Router';
import LoginModal from '@/components/LoginModal';
import ModuleNavLinks from '@/components/ModuleNavLinks';
import ToolPageLayout from '@/components/ToolPageLayout';
import { useAuth } from '../../../hooks/useAuth';
import navStyles from '@/components/ModuleNavLinks/index.module.less';

const NAV_ITEMS = [
  { path: '/log/home', label: '模块首页', match: 'home' },
  { path: '/log/query', label: '普通日志', match: 'query' },
  { path: '/log/system', label: '系统日志', match: 'system', superOnly: true },
];

export default function LogLayout(props: { children?: React.ReactNode }) {
  const routerIds = useRouterIds();
  const current = String(routerIds[routerIds.length - 1] || 'home');
  const { isAuthenticated, user, isSuperAdmin } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const navItems = useMemo(
    () => NAV_ITEMS
      .filter(item => !item.superOnly || isSuperAdmin)
      .map(({ superOnly: _s, ...item }) => item),
    [isSuperAdmin],
  );

  const headerActions = (
    <>
      {!isAuthenticated && (
        <button type="button" className={navStyles.loginBtn} onClick={() => setLoginOpen(true)}>
          <LoginOutlined /> 登录
        </button>
      )}
      {isAuthenticated && user && (
        <span className={navStyles.userTag}>{user.username}</span>
      )}
    </>
  );

  return (
    <ToolPageLayout
      actions={<ModuleNavLinks items={navItems} current={current} />}
      headerActions={headerActions}
    >
      {props.children}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </ToolPageLayout>
  );
}
