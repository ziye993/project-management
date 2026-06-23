import { fetchStream, post } from ".";

const basePath = '/project'

export const getProjectList = async () => {
  return await post(basePath + "/getProjectList");
}

export const forceRefreshList = async () => {
  return await post(basePath + '/forceRefreshList')
}

export const runCom = async (param: { path: string; value: string }, event: (data: any) => void) => {
  fetchStream(basePath + '/runCommand', { ...param }, event);
}

export const stopCommand = async (param: { path: string; value: string }) => {
  return await post(basePath + '/stopCommand', param)
}

export const closeCommand = async (param: { path: string; value: string }) => {
  return await post(basePath + '/closeCommand', param)
}

export const getRunningList = async () => {
  return await post(basePath + '/getRunningList')
}

export const importWorkspace = async (folderPath: string) => {
  return await post(basePath + '/importWorkspace', { path: folderPath })
}

export const importProject = async (folderPath: string) => {
  return await post(basePath + '/importProject', { path: folderPath })
}

export const refreshColorCache = async () => {
  return await post(basePath + '/refreshColorCache')
}

export const getColorGroups = async () => {
  return await post(basePath + '/getColorGroups')
}

export const removeProject = async (path: string) => {
  return await post(basePath + '/removeProject', { path })
}

export const getLogs = async () => {
  return await post(basePath + '/getLogs');
}

export const openInVscode = async (param: { path: string }) => {
  return await post(basePath + '/openInVscode', param);
}
