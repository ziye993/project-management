import app from '../../app.js';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  capabilityCatalog,
  capabilityMine,
  capabilityListByUser,
  capabilityGrant,
  capabilityRevoke,
  capabilityScopes,
} from './user.js';

const gate = [authenticateToken];

app.post('/api/auth/user/list', ...gate, listUsers);
app.post('/api/auth/user/create', ...gate, createUser);
app.post('/api/auth/user/update', ...gate, updateUser);
app.post('/api/auth/user/resetPassword', ...gate, resetPassword);

app.post('/api/auth/capability/catalog', ...gate, capabilityCatalog);
app.post('/api/auth/capability/mine', ...gate, capabilityMine);
app.post('/api/auth/capability/scopes', ...gate, capabilityScopes);
app.post('/api/auth/capability/listByUser', ...gate, capabilityListByUser);
app.post('/api/auth/capability/grant', ...gate, capabilityGrant);
app.post('/api/auth/capability/revoke', ...gate, capabilityRevoke);

console.log('[AuthService] 能力授权模块已注册');
