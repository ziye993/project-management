import { postLogApi } from './remote';

export const createAuthApi = (logApiBaseUrl: string) => ({
  listUsers: (params: { username?: string; status?: number | ''; page?: number; pageSize?: number }) =>
    postLogApi(logApiBaseUrl, '/auth/user/list', params),

  createUser: (data: { username: string; password: string; email?: string }) =>
    postLogApi(logApiBaseUrl, '/auth/user/create', data),

  updateUser: (data: { id: number; email?: string; status?: number }) =>
    postLogApi(logApiBaseUrl, '/auth/user/update', data),

  resetPassword: (data: { id: number; password: string }) =>
    postLogApi(logApiBaseUrl, '/auth/user/resetPassword', data),

  grantOrg: (data: { userId: number; orgId: number; role: 'manage' | 'view' }) =>
    postLogApi(logApiBaseUrl, '/auth/grant/org', data),

  grantProject: (data: { userId: number; projectId: number; role: 'manage' | 'view' }) =>
    postLogApi(logApiBaseUrl, '/auth/grant/project', data),

  revokeGrant: (data: { userId: number; orgId?: number; projectId?: number }) =>
    postLogApi(logApiBaseUrl, '/auth/grant/revoke', data),

  listGrants: (userId: number) =>
    postLogApi(logApiBaseUrl, '/auth/grant/list', { userId }),
});
