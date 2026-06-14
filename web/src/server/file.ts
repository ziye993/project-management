import { post, upload } from ".";

const basePath = "/file"

export const getFileList = async (param: { path?: string[]; absPath?: string } = {}) => {
  return await post(basePath + '/fileList', param);
}

export const uploadPic = async (param: FormData) => {
  return await upload('/upload/uploadPic', param);
}

export const getPicList = async () => {
  return await post(basePath + '/getPicList', {});
}
