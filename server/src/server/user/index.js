import app from '../../app.js';
import {authenticateToken, loginToToken, sendEmailCode, login} from "./auth.js";

app.post('/api/user/login', login);
app.post('/api/user/sendEmailCode', sendEmailCode);
app.post('/api/user/loginToToken', loginToToken);