import crypto from 'crypto';
import { ENV } from './_core/env';

/**
 * Encryption utility for sensitive data (API keys, secrets)
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Derive encryption key from master secret
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    ENV.cookieSecret, // Use cookie secret as master key
    salt,
    100000, // iterations
    32, // key length
    'sha256'
  );
}

/**
 * Encrypt sensitive data
 */
export function encrypt(plaintext: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine: salt + iv + authTag + encrypted
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypt sensitive data
 */
export function decrypt(ciphertext: string): string {
  const combined = Buffer.from(ciphertext, 'base64');
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = deriveKey(salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash sensitive data (one-way, for verification)
 */
export function hash(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}
