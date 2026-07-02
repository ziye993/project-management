import message from '@/components/ui/Modal/message';

export interface ApiJson {
  success?: boolean;
  code?: number | string;
  msg?: string;
  data?: any;
}

export interface ApiRequestOptions {
  base: string;
  suppressErrorCodes?: string[];
  extraHeaders?: Record<string, string>;
}

function buildApiUrl(base: string, url: string) {
  const normalized = base.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  if (normalized.endsWith('/api')) {
    return `${normalized}${path}`;
  }
  return `${normalized}/api${path}`;
}

function isApiSuccess(json: ApiJson) {
  return json.code === 0 || json.success === true;
}

export async function requestJson(
  options: ApiRequestOptions,
  url: string,
  data: Record<string, unknown> = {},
): Promise<ApiJson> {
  let res: Response;
  try {
    res = await fetch(buildApiUrl(options.base, url), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.extraHeaders,
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.log(error);
    message.error({ content: '无法连接服务器' });
    throw error;
  }

  const jsonData: ApiJson = await res.json();

  if (res.status === 429 && jsonData.code === 'LOGIN_RATE_LIMITED') {
    message.error({ content: jsonData.msg || '登录失败次数过多' });
    throw new Error(String(jsonData.code));
  }

  if (!res.ok) {
    message.error({ content: jsonData?.msg || '服务器错误' });
    throw new Error(`请求失败：${res.status}`);
  }

  if (!isApiSuccess(jsonData)) {
    const code = String(jsonData.code ?? '');
    const suppress = options.suppressErrorCodes ?? [];
    if (!suppress.includes(code) && code !== 'NOT_TOKEN') {
      message.error({ content: jsonData?.msg });
    }
    throw new Error(`请求失败 code：${jsonData.code}`);
  }

  return jsonData;
}

export async function uploadJson(base: string, url: string, formData: FormData): Promise<ApiJson> {
  const res = await fetch(buildApiUrl(base, url), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const jsonData: ApiJson = await res.json();

  if (!res.ok) {
    message.error({ content: jsonData?.msg || '服务器错误' });
    throw new Error(`请求失败：${res.status}`);
  }

  if (!isApiSuccess(jsonData)) {
    message.error({ content: jsonData?.msg });
    throw new Error(`请求失败 code：${jsonData.code}`);
  }

  return jsonData;
}

export async function streamRequest(
  base: string,
  url: string,
  params: Record<string, unknown>,
  onEvent: (data: unknown) => void,
) {
  const response = await fetch(buildApiUrl(base, url), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      onEvent(true);
      break;
    }
    onEvent(decoder.decode(value));
  }
}
