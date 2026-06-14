import { post, upload } from ".";

export const getPicList = async () => post('/file/getPicList', {});
export const getMovList = async () => post('/file/getMovList', {});
export const getFileLinks = async (type: string, storedName: string) =>
  post('/file/getFileLinks', { type, storedName });

export const uploadPic = async (formData: FormData) => upload('/upload/uploadPic', formData);
export const uploadMov = async (formData: FormData) => upload('/upload/uploadMov', formData);

export const chunkInit = async (filename: string, totalChunks: number, type = 'mov') =>
  post('/upload/chunkInit', { filename, totalChunks, type });

export const chunkUpload = async (uploadId: string, chunkIndex: number, blob: Blob) => {
  const formData = new FormData();
  formData.append('chunk', blob);
  formData.append('uploadId', uploadId);
  formData.append('chunkIndex', String(chunkIndex));
  return upload('/upload/chunk', formData);
};

export const chunkMerge = async (uploadId: string) => post('/upload/chunkMerge', { uploadId });

export const deleteMedia = async (type: 'pic' | 'mov', storedName: string) =>
  post('/file/deleteMedia', { type, storedName });
