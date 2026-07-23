import { useEffect, useState } from 'react';
import { LoginOutlined } from '@ant-design/icons';
import { useNavigate, useRouterIds } from '@/Router';
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
  const { push } = useNavigate();
  const routerIds = useRouterIds();
  const current = String(routerIds[routerIds.length - 1] || 'home');
  const { isAuthenticated, user, isSuperAdmin, hasCapability } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const canUsers = isSuperAdmin
    || hasCapability('auth.user.create')
    || hasCapability('auth.user.update')
    || hasCapability('auth.grant')
    || hasCapability('auth.grant.list');
  const canTenants = isSuperAdmin
    || hasCapability('log.org.read')
    || hasCapability('log.org.update');
  const canWorkspace = isSuperAdmin
    || hasCapability('log.project.read')
    || hasCapability('log.project.create')
    || hasCapability('log.project.update')
    || hasCapability('log.key.list')
    || hasCapability('log.key.create')
    || hasCapability('log.key.toggle')
    || hasCapability('log.key.delete');

  useEffect(() => {
    if (current === 'detail') return;
    if (current === 'home' && !canUsers) {
      if (canWorkspace) push('/auth/workspace');
      else if (canTenants) push('/auth/tenants');
    } else if (current === 'tenants' && !canTenants) {
      if (canUsers) push('/auth/home');
      else if (canWorkspace) push('/auth/workspace');
    } else if (current === 'workspace' && !canWorkspace) {
      if (canUsers) push('/auth/home');
      else if (canTenants) push('/auth/tenants');
    }
  }, [current, canUsers, canTenants, canWorkspace, push]);

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    hidden:
      (item.match === 'home' && !canUsers)
      || (item.match === 'tenants' && !canTenants)
      || (item.match === 'workspace' && !canWorkspace),
  }));

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
