import crypto from 'crypto';

let keyPair = null;

function getKeyPair() {
  if (!keyPair) {
    if (process.env.RSA_PRIVATE_KEY) {
      const privateKey = process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n');
      keyPair = {
        privateKey,
        publicKey: crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }),
      };
    } else {
      const generated = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      keyPair = { publicKey: generated.publicKey, privateKey: generated.privateKey };
    }
  }
  return keyPair;
}

export function getPasswordPublicKey() {
  return getKeyPair().publicKey;
}

export function decryptLoginPassword(encryptedBase64) {
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const plain = crypto.privateDecrypt(
    {
      key: getKeyPair().privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encrypted,
  );
  return plain.toString('utf8');
}
