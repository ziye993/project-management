import { post, baseUrl } from ".";

export const getServerStatus = async () => post('/system/getServerStatus', {});
export const getLanAddresses = async () => post('/system/getLanAddresses', {});

export const shutdownServer = async () => {
  const res = await fetch(`${baseUrl}/system/shutdown`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('关闭服务失败');
  return res.json();
};
