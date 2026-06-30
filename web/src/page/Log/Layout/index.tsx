import { useState } from 'react';
import { LoginOutlined } from '@ant-design/icons';
import { useRouterIds } from '../../../Router';
import LoginModal from '../../../compomeents/LoginModal';
import ModuleNavLinks from '../../../compomeents/ModuleNavLinks';
import ToolPageLayout from '../../../compomeents/ToolPageLayout';
import { useAuth } from '../../../hooks/useAuth';
import navStyles from '../../../compomeents/ModuleNavLinks/index.module.less';

const NAV_ITEMS = [
  { path: '/log/home', label: '模块首页', match: 'home' },
  { path: '/log/query', label: '日志查询', match: 'query' },
  { path: '/log/tenants', label: '租户管理', match: 'tenants' },
  { path: '/log/workspace', label: '租户工作台', match: 'workspace' },
];

export default function LogLayout(props: { children?: React.ReactNode }) {
  const routerIds = useRouterIds();
  const current = String(routerIds[routerIds.length - 1] || 'home');
  const { isAuthenticated, user, canManageLog } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    hidden: (item.match === 'tenants' || item.match === 'workspace') && !canManageLog,
  }));

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
