import { useMemo } from 'react';
import { createLogApi } from '@/api/log';
import { useAuth } from './useAuth';
import { resolveEffectiveLogApiBaseUrl } from '../utils/logApiBase';

export function useLogApi() {
  const { logApiBaseUrl } = useAuth();
  return useMemo(
    () => createLogApi(resolveEffectiveLogApiBaseUrl(logApiBaseUrl)),
    [logApiBaseUrl],
  );
}
