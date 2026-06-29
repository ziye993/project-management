import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resolveModuleKey } from '../utils/moduleMap';
import { useNavigate } from './index';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { visibleModules, loading } = useAuth();
  const { push } = useNavigate();

  useEffect(() => {
    if (loading) return;

    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    if (pathname === '/' || pathname === '/404') return;

    const moduleKey = resolveModuleKey(pathname);
    if (!moduleKey || moduleKey === 'home') return;

    if (!visibleModules.includes(moduleKey)) {
      push('/');
    }
  }, [loading, visibleModules, push]);

  return <>{children}</>;
}
