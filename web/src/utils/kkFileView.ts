/** kkFileView 预览服务地址（与接入说明中的 onlinePreview 对应） */
export const KK_FILE_VIEW_BASE_URL = 'http://ziye993.cn:40011';

export interface AccessLinkLike {
  type: string;
  label: string;
  url: string;
}

/** 与 kkFileView 前端 Demo 一致的 Base64 编码（支持中文 URL） */
export function base64Encode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    ),
  );
}

/** 优先公网，其次局域网，最后本机，供 kkFileView 拉取文件 */
export function pickFileAccessUrl(links: AccessLinkLike[] | undefined | null): string | null {
  if (!links?.length) return null;
  const byType = (type: string) => links.find(l => l.type === type)?.url;
  return byType('public') || byType('lan') || byType('localhost') || links[0]?.url || null;
}

/** 单文件预览页 URL：/onlinePreview?url=encodeURIComponent(base64(fileUrl)) */
export function buildKkFileViewPreviewUrl(
  fileUrl: string,
  baseUrl: string = KK_FILE_VIEW_BASE_URL,
): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/onlinePreview?url=${encodeURIComponent(base64Encode(fileUrl))}`;
}
