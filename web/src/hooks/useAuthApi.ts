import { useMemo } from 'react';
import { createAuthApi } from '../server/auth';
import { useAuth } from './useAuth';
import { resolveEffectiveLogApiBaseUrl } from '../utils/logApiBase';

export function useAuthApi() {
  const { logApiBaseUrl } = useAuth();
  return useMemo(
    () => createAuthApi(resolveEffectiveLogApiBaseUrl(logApiBaseUrl)),
    [logApiBaseUrl],
  );
}
