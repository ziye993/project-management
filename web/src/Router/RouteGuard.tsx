import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resolveModuleKey } from '../utils/moduleMap';
import { useNavigate, useRouterIds } from './index';
import ModuleAuthGate from '@/components/ModuleAuthGate';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { visibleModules, loading } = useAuth();
  const { push } = useNavigate();
  const routerIds = useRouterIds();

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const moduleKey = pathname === '/' || pathname === '/404' ? null : resolveModuleKey(pathname);

  useEffect(() => {
    if (loading) return;
    if (!moduleKey || moduleKey === 'home') return;
    if (!visibleModules.includes(moduleKey)) {
      push('/');
    }
  }, [loading, visibleModules, push, moduleKey, routerIds]);

  if (loading) return <>{children}</>;

  if (moduleKey && moduleKey !== 'home' && visibleModules.includes(moduleKey)) {
    return <ModuleAuthGate moduleKey={moduleKey}>{children}</ModuleAuthGate>;
  }

  return <>{children}</>;
}
