import { encryptPassword } from '../utils/passwordCrypto';
import { postRemote } from './remote';

export const login = async (logApiBaseUrl: string, username: string, password: string) => {
  const encrypted = await encryptPassword(logApiBaseUrl, password);
  return postRemote(logApiBaseUrl, '/user/login', { username, password: encrypted, encrypted: true });
};

export const logout = (logApiBaseUrl: string) =>
  postRemote(logApiBaseUrl, '/user/logout', {});

export const fetchMe = (logApiBaseUrl: string) =>
  postRemote(logApiBaseUrl, '/user/me', {});
