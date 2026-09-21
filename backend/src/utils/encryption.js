const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');

// AES-256-GCM gives you both encryption AND authentication (tamper
// detection) - unlike AES-256-CBC, a modified ciphertext will fail
// decryption rather than silently producing garbage plaintext.
// This matters here because a tampered access token would make silent
// API calls on behalf of a user with a corrupted credential.

/**
 * Encrypt a plaintext string. Returns a single colon-delimited string
 * containing the IV, auth tag, and ciphertext - all the components
 * needed to decrypt, stored together so we don't need extra DB columns.
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string produced by encrypt(). Throws if the ciphertext
 * has been tampered with - that's the GCM auth tag doing its job.
 */
function decrypt(encryptedString) {
  if (!encryptedString) return null;
  const [ivHex, authTagHex, encryptedHex] = encryptedString.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };