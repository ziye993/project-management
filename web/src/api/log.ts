import { postLogApi } from './remote';

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

function logPost(logApiBaseUrl: string, url: string, params: Record<string, unknown> = {}) {
  return postLogApi(logApiBaseUrl, `${base}${url}`, params);
}

export const createLogApi = (logApiBaseUrl: string) => ({
  listOrgs: (params: {
    orgName?: string;
    status?: number | '';
    page?: number;
    pageSize?: number;
  }) => logPost(logApiBaseUrl, '/org/list', params),

  getOrgDetail: (id: number) => logPost(logApiBaseUrl, '/org/detail', { id }),

  createOrg: (data: {
    org_name: string;
    contact_name?: string;
    contact_phone?: string;
    remark?: string;
    bootstrapUser: { username: string; password: string; email?: string } | { userId: number };
  }) => logPost(logApiBaseUrl, '/org/create', data),

  updateOrg: (data: {
    id: number;
    org_name: string;
    contact_name?: string;
    contact_phone?: string;
    remark?: string;
    status?: number;
  }) => logPost(logApiBaseUrl, '/org/update', data),

  toggleOrgStatus: (id: number) => logPost(logApiBaseUrl, '/org/toggleStatus', { id }),

  listProjects: (orgId: number) => logPost(logApiBaseUrl, '/project/list', { orgId }),

  createProject: (data: {
    orgId: number;
    project_name: string;
    project_code: string;
    description?: string;
  }) => logPost(logApiBaseUrl, '/project/create', data),

  updateProject: (data: {
    id: number;
    project_name: string;
    description?: string;
    status?: number;
  }) => logPost(logApiBaseUrl, '/project/update', data),

  toggleProjectStatus: (id: number) => logPost(logApiBaseUrl, '/project/toggleStatus', { id }),

  listKeys: (projectId: number) => logPost(logApiBaseUrl, '/key/list', { projectId }),

  createKey: (data: {
    projectId: number;
    key_name?: string;
    expire_time?: string;
    remark?: string;
  }) => logPost(logApiBaseUrl, '/key/create', data),

  toggleKeyStatus: (id: number) => logPost(logApiBaseUrl, '/key/toggleStatus', { id }),

  deleteKey: (id: number) => logPost(logApiBaseUrl, '/key/delete', { id }),

  listLogs: (params: {
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
  }) => logPost(logApiBaseUrl, '/log/list', params),

  getLogDetail: (id: number) => logPost(logApiBaseUrl, '/log/detail', { id }),

  listAuditLogs: (params: {
    action?: string;
    username?: string;
    keyword?: string;
    startTime?: string;
    endTime?: string;
    page?: number;
    pageSize?: number;
  }) => logPost(logApiBaseUrl, '/audit/list', params),

  getAuditDetail: (id: number) => logPost(logApiBaseUrl, '/audit/detail', { id }),

  runRetention: () => logPost(logApiBaseUrl, '/retention/run', {}),
});

// backward-compatible helpers (require logApiBaseUrl from useAuth)
export { createLogApi as default };
