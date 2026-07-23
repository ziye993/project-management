import { useState } from 'react';
import { LoginOutlined } from '@ant-design/icons';
import { useRouterIds } from '@/Router';
import LoginModal from '@/components/LoginModal';
import ModuleNavLinks from '@/components/ModuleNavLinks';
import ToolPageLayout from '@/components/ToolPageLayout';
import { useAuth } from '@/hooks/useAuth';
import navStyles from '@/components/ModuleNavLinks/index.module.less';

const NAV_ITEMS = [
  { path: '/auth/home', label: '用户管理', match: 'home' },
  { path: '/auth/tenants', label: '租户管理', match: 'tenants' },
  { path: '/auth/workspace', label: '租户工作台', match: 'workspace' },
];

export default function AuthLayout(props: { children?: React.ReactNode }) {
  const routerIds = useRouterIds();
  const current = String(routerIds[routerIds.length - 1] || 'home');
  const { isAuthenticated, user, isSuperAdmin, canManageLog } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const showTenantNav = isSuperAdmin || canManageLog;

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    hidden: (item.match === 'tenants' || item.match === 'workspace') && !showTenantNav,
  }));

  // 用户详情页用「用户管理」高亮
  const navCurrent = current === 'detail' ? 'home' : current;

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
      actions={<ModuleNavLinks items={navItems} current={navCurrent} />}
      headerActions={headerActions}
    >
      {props.children}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </ToolPageLayout>
  );
}
