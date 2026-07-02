import { post, upload } from ".";

export const getShareList = async (relativePath = '', chatOnly = false) =>
  post('/share/list', { relativePath, chatOnly });
export const createShareFolder = async (relativePath: string, name: string) =>
  post('/share/mkdir', { relativePath, name });
export const uploadShareFiles = async (
  relativePath: string,
  files: File[],
  options?: { source?: 'chat' },
) => {
  const formData = new FormData();
  formData.append('relativePath', relativePath);
  if (options?.source) formData.append('source', options.source);
  files.forEach(f => formData.append('files', f));
  return upload('/share/upload', formData);
};
export const deleteShareItem = async (relativePath: string) => post('/share/delete', { relativePath });
