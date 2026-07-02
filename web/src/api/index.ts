import { requestJson, streamRequest, uploadJson } from './client';

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:30014';

export const baseUrl = `${origin}/api`;
export const baseServerIp = origin;

export { postRemote, postLogApi } from './remote';

export function post(url: string, data: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return requestJson({ base: origin, extraHeaders: headers }, url, data);
}

export function upload(url: string, formData: FormData) {
  return uploadJson(origin, url, formData);
}

export function fetchStream(url: string, params: Record<string, unknown>, onEvent: (data: unknown) => void) {
  return streamRequest(origin, url, params, onEvent);
}
