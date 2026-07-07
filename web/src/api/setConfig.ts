import { post } from ".";
import type { MockFieldDefaults } from '../type/mockDefaults';
import type { ModuleAccessConfig } from '../constants/moduleAccess';
import type { CustomProjectCommand } from '../constants/customCommands';

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

export const setCommandSortOrder = async (param: { commandSortOrder: string[] }) => {
  return await post(basePath + '/setCommandSortOrder', param);
}

export const setMockFieldDefaults = async (param: { mockFieldDefaults: MockFieldDefaults }) => {
  return await post(basePath + '/setMockFieldDefaults', param);
}

export const setModuleAccess = async (param: { moduleAccess: ModuleAccessConfig }) => {
  return await post(basePath + '/setModuleAccess', param);
}

export const setCustomProjectCommands = async (param: { customProjectCommands: CustomProjectCommand[] }) => {
  return await post(basePath + '/setCustomProjectCommands', param);
}
