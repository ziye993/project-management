import app from '../../app.js';
import { requireSuperAdmin, optionalAuthenticate } from '../../middleware/auth.js';
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  grantOrg,
  grantProject,
  revokeGrant,
  listGrants,
} from './user.js';

const authGate = [optionalAuthenticate, requireSuperAdmin];

app.post('/api/auth/user/list', ...authGate, listUsers);
app.post('/api/auth/user/create', ...authGate, createUser);
app.post('/api/auth/user/update', ...authGate, updateUser);
app.post('/api/auth/user/resetPassword', ...authGate, resetPassword);
app.post('/api/auth/grant/org', ...authGate, grantOrg);
app.post('/api/auth/grant/project', ...authGate, grantProject);
app.post('/api/auth/grant/revoke', ...authGate, revokeGrant);
app.post('/api/auth/grant/list', ...authGate, listGrants);

console.log('[AuthService] 权限管理模块已注册');
