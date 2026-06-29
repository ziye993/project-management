import app from '../../app.js';
import { getPublicKey, login, logout, me, sendEmailCode } from './auth.js';

app.post('/api/user/publicKey', getPublicKey);
app.post('/api/user/login', login);
app.post('/api/user/logout', logout);
app.post('/api/user/me', me);
app.post('/api/user/sendEmailCode', sendEmailCode);
