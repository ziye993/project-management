import { requestJson } from './client';

export function postRemote(base: string, url: string, data: Record<string, unknown> = {}) {
  return requestJson({ base, suppressErrorCodes: ['NOT_TOKEN'] }, url, data);
}

export function postLogApi(logApiBaseUrl: string, url: string, data: Record<string, unknown> = {}) {
  return postRemote(logApiBaseUrl, url, data);
}
