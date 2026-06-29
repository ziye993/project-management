let cachedPublicKey: CryptoKey | null = null;
let cachedPem: string | null = null;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(pem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

async function fetchPublicKeyPem(baseUrl: string): Promise<string> {
  const normalized = baseUrl.replace(/\/$/, '');
  const res = await fetch(`${normalized}/api/user/publicKey`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const json = await res.json();
  if (!res.ok || json.code !== 0 || !json.data?.publicKey) {
    throw new Error(json.msg || '获取公钥失败');
  }
  return json.data.publicKey as string;
}

async function getPublicKey(baseUrl: string): Promise<CryptoKey> {
  const pem = await fetchPublicKeyPem(baseUrl);
  if (cachedPem !== pem || !cachedPublicKey) {
    cachedPublicKey = await importPublicKey(pem);
    cachedPem = pem;
  }
  return cachedPublicKey;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function encryptPassword(baseUrl: string, password: string): Promise<string> {
  const key = await getPublicKey(baseUrl);
  const encoded = new TextEncoder().encode(password);
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
  return arrayBufferToBase64(encrypted);
}
