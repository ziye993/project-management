import { postLogApi } from './remote';

export const createAuthApi = (logApiBaseUrl: string) => ({
  listUsers: (params: { username?: string; status?: number | ''; page?: number; pageSize?: number }) =>
    postLogApi(logApiBaseUrl, '/auth/user/list', params),

  createUser: (data: { username: string; password: string; email?: string }) =>
    postLogApi(logApiBaseUrl, '/auth/user/create', data),

  updateUser: (data: { id: number; email?: string; status?: number; is_super_admin?: number }) =>
    postLogApi(logApiBaseUrl, '/auth/user/update', data),

  resetPassword: (data: { id: number; password: string }) =>
    postLogApi(logApiBaseUrl, '/auth/user/resetPassword', data),

  capabilityCatalog: () =>
    postLogApi(logApiBaseUrl, '/auth/capability/catalog', {}),

  capabilityMine: () =>
    postLogApi(logApiBaseUrl, '/auth/capability/mine', {}),

  listGrantsByUser: (userId: number) =>
    postLogApi(logApiBaseUrl, '/auth/capability/listByUser', { userId }),

  grantCapability: (data: {
    userId: number;
    capability: string;
    scopeType: 'org' | 'project';
    scopeId: number;
    canDelegate?: boolean;
    canRevokePeer?: boolean;
  }) => postLogApi(logApiBaseUrl, '/auth/capability/grant', data),

  revokeCapability: (data: {
    grantId?: number;
    userId?: number;
    capability?: string;
    scopeType?: 'org' | 'project';
    scopeId?: number;
  }) => postLogApi(logApiBaseUrl, '/auth/capability/revoke', data),
});
