import message from "../UiComponents/Modal/message";

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:30000';

export const baseUrl = `${origin}/api`;
export const baseServerIp = origin;

export const upload = async (url: string, formData: FormData) => {
  const res = await fetch(baseUrl + url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    message.error({ content: "服务器错误" });
    throw new Error(`请求失败：${res.status}`);
  }

  const jsonData = await res.json();
  if (jsonData.code !== 0 && !jsonData.success) {
    message.error({ content: jsonData?.msg });
    throw new Error(`请求失败 code ：${jsonData.code}`);
  }

  return jsonData;
}

export async function post(url: string, data = {}, headers: any = {}) {
  let res: Response | undefined;
  try {
    res = await fetch(baseUrl + url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.log(error);
    message.error({ content: "无法连接服务器" });
    throw error;
  }

  if (!res?.ok) {
    message.error({ content: "服务器错误" });
    throw new Error(`请求失败：${res.status}`);
  }

  const jsonData = await res.json();
  if (jsonData.code !== 0 && !jsonData.success) {
    message.error({ content: jsonData?.msg });
    throw new Error(`请求失败 code ：${jsonData.code}`);
  }

  return jsonData;
}

export async function fetchStream(url: string, params: any, event: (data: any) => void) {
  const response = await fetch(baseUrl + url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      event(true);
      break;
    }
    const text = decoder.decode(value);
    event(text);
  }
}
