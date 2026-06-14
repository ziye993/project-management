import { post } from ".";

const basePath = "/config"

export const getConfig = async () => {
  return await post(basePath + '/getConfig', {});
}

export const setPicUploadPath = async (param: { uploadPath: string }) => {
  return await post(basePath + '/setPicUploadPath', param);
}

export const setMovUploadPath = async (param: { uploadPath: string }) => {
  return await post(basePath + '/setMovUploadPath', param);
}

export const setFileUploadPath = async (param: { uploadPath: string }) => {
  return await post(basePath + '/setFileUploadPath', param);
}

export const setPublicBaseUrl = async (param: { publicBaseUrl: string }) => {
  return await post(basePath + '/setPublicBaseUrl', param);
}
