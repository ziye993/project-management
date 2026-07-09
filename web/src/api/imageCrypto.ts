import { post } from '.';

export const saveImageCryptoMeta = async (param: {
  storedName: string;
  kind?: string;
  params?: Record<string, unknown>;
  paramString?: string;
}) => post('/imageCrypto/saveMeta', param);

export const getImageCryptoMeta = async (param: { storedName: string }) =>
  post('/imageCrypto/getMeta', param);

export const createSmartRevealSession = async (param: { imageBase64: string }) =>
  post('/imageCrypto/session/create', param);

export const refineSmartRevealSession = async (param: {
  sessionId: string;
  roundIndex: number;
  selectedPresetIndex: number;
}) => post('/imageCrypto/session/refine', param);

export const getSmartRevealHistory = async (param: { sessionId: string }) =>
  post('/imageCrypto/session/history', param);
