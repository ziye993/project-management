import { post } from '.';

const base = '/log/manage';

export interface OrgItem {
  id: number;
  org_name: string;
  contact_name?: string;
  contact_phone?: string;
  status: number;
  projectCount?: number;
  create_time: string;
  remark?: string;
}

export interface ProjectItem {
  id: number;
  org_id: number;
  project_name: string;
  project_code: string;
  description?: string;
  status: number;
  create_time: string;
}

export interface ApiKeyItem {
  id: number;
  key_name?: string;
  status: number;
  expire_time?: string;
  last_used_time?: string;
  last_ip?: string;
  create_time: string;
  remark?: string;
}

export interface LogItem {
  id: number;
  org_id: number;
  project_id: number;
  org_name?: string;
  project_name?: string;
  level: string;
  module?: string;
  title?: string;
  content: string;
  trace_id?: string;
  client_ip?: string;
  create_time: string;
}

export const listOrgs = (params: {
  orgName?: string;
  status?: number | '';
  page?: number;
  pageSize?: number;
}) => post(`${base}/org/list`, params);

export const getOrgDetail = (id: number) => post(`${base}/org/detail`, { id });

export const createOrg = (data: {
  org_name: string;
  contact_name?: string;
  contact_phone?: string;
  remark?: string;
}) => post(`${base}/org/create`, data);

export const updateOrg = (data: {
  id: number;
  org_name: string;
  contact_name?: string;
  contact_phone?: string;
  remark?: string;
  status?: number;
}) => post(`${base}/org/update`, data);

export const toggleOrgStatus = (id: number) => post(`${base}/org/toggleStatus`, { id });

export const listProjects = (orgId: number) => post(`${base}/project/list`, { orgId });

export const createProject = (data: {
  orgId: number;
  project_name: string;
  project_code: string;
  description?: string;
}) => post(`${base}/project/create`, data);

export const updateProject = (data: {
  id: number;
  project_name: string;
  description?: string;
  status?: number;
}) => post(`${base}/project/update`, data);

export const toggleProjectStatus = (id: number) => post(`${base}/project/toggleStatus`, { id });

export const listKeys = (projectId: number) => post(`${base}/key/list`, { projectId });

export const createKey = (data: {
  projectId: number;
  key_name?: string;
  expire_time?: string;
  remark?: string;
}) => post(`${base}/key/create`, data);

export const toggleKeyStatus = (id: number) => post(`${base}/key/toggleStatus`, { id });

export const deleteKey = (id: number) => post(`${base}/key/delete`, { id });

export const listLogs = (params: {
  orgId?: number;
  projectId?: number;
  level?: string;
  module?: string;
  traceId?: string;
  keyword?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}) => post(`${base}/log/list`, params);

export const getLogDetail = (id: number) => post(`${base}/log/detail`, { id });

export const runRetention = () => post(`${base}/retention/run`, {});
