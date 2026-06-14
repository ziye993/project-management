import { post, upload } from ".";

export const getShareList = async (relativePath = '') => post('/share/list', { relativePath });
export const createShareFolder = async (relativePath: string, name: string) =>
  post('/share/mkdir', { relativePath, name });
export const uploadShareFiles = async (relativePath: string, files: File[]) => {
  const formData = new FormData();
  formData.append('relativePath', relativePath);
  files.forEach(f => formData.append('files', f));
  return upload('/share/upload', formData);
};
export const deleteShareItem = async (relativePath: string) => post('/share/delete', { relativePath });
