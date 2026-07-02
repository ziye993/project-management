import { baseServerIp, upload } from '@/api';
import { uploadShareFiles } from '@/api/share';
import type { MessageType } from '../type/chat';

export const CHAT_SHARE_FOLDER = 'chat';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'heif', 'tiff']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpeg', 'mpg', '3gp']);

export function classifyChatFile(file: File): 'image' | 'video' | 'file' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  return 'file';
}

export function fileNameFromUrl(url: string) {
  try {
    const raw = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '文件');
    const match = raw.match(/^\d+-(.+)$/);
    return match ? match[1] : raw;
  } catch {
    return '文件';
  }
}

export async function uploadChatFile(file: File): Promise<{ url: string; type: MessageType }> {
  const kind = classifyChatFile(file);
  if (kind === 'image' || kind === 'video') {
    const formData = new FormData();
    formData.append('files', file);
    const endpoint = kind === 'image' ? '/upload/uploadPic?source=chat' : '/upload/uploadMov?source=chat';
    const res = await upload(endpoint, formData);
    const item = res?.data?.[res.data.length - 1] || res?.data;
    const urlPath = kind === 'image'
      ? `/static/pic/${item.storedName || item.filename}`
      : `/static/mov/${item.storedName || item.filename}`;
    return { url: `${baseServerIp}${urlPath}`, type: kind };
  }

  const res = await uploadShareFiles(CHAT_SHARE_FOLDER, [file], { source: 'chat' });
  const item = res?.data?.[0];
  const url = item?.downloadLinks?.[0]?.url
    || `${baseServerIp}/static/share/${item?.relativePath || `${CHAT_SHARE_FOLDER}/${item?.name || file.name}`}`;
  return { url, type: 'file' };
}

export function getClipboardFiles(data: DataTransfer): File[] {
  const fromFiles = Array.from(data.files || []);
  if (fromFiles.length) return fromFiles;
  return Array.from(data.items || [])
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((f): f is File => !!f);
}
