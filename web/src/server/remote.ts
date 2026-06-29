import message from '../UiComponents/Modal/message';

export async function postRemote(base: string, url: string, data: Record<string, unknown> = {}) {
  const normalized = base.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  const res = await fetch(`${normalized}/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const jsonData = await res.json();

  if (res.status === 429 && jsonData.code === 'LOGIN_RATE_LIMITED') {
    message.error({ content: jsonData.msg || '登录失败次数过多' });
    throw new Error(jsonData.code);
  }

  if (!res.ok) {
    message.error({ content: jsonData?.msg || '服务器错误' });
    throw new Error(`请求失败：${res.status}`);
  }

  if (jsonData.code !== 0 && !jsonData.success) {
    if (jsonData.code !== 'NOT_TOKEN') {
      message.error({ content: jsonData?.msg });
    }
    throw new Error(`请求失败 code：${jsonData.code}`);
  }

  return jsonData;
}

export function postLogApi(logApiBaseUrl: string, url: string, data: Record<string, unknown> = {}) {
  return postRemote(logApiBaseUrl, url, data);
}
