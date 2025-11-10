import CryptoJS from 'crypto-js';
import { ENV } from '../_core/env';

/**
 * Encryption utility for securing sensitive data like API keys
 * Uses AES encryption with the JWT_SECRET as the encryption key
 */

const ENCRYPTION_KEY = ENV.cookieSecret;

/**
 * Encrypt a string value
 * @param value - The plain text value to encrypt
 * @returns The encrypted string
 */
export function encrypt(value: string): string {
  if (!value) return '';
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt an encrypted string
 * @param encryptedValue - The encrypted string
 * @returns The decrypted plain text
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue) return '';
  const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt an API key object
 * @param apiKey - The API key
 * @param secretKey - The secret key
 * @param passphrase - Optional passphrase
 * @returns Encrypted keys object
 */
export function encryptApiKeys(apiKey: string, secretKey: string, passphrase?: string) {
  return {
    apiKey: encrypt(apiKey),
    secretKey: encrypt(secretKey),
    passphrase: passphrase ? encrypt(passphrase) : null,
  };
}

/**
 * Decrypt an API key object
 * @param encryptedApiKey - The encrypted API key
 * @param encryptedSecretKey - The encrypted secret key
 * @param encryptedPassphrase - Optional encrypted passphrase
 * @returns Decrypted keys object
 */
export function decryptApiKeys(
  encryptedApiKey: string,
  encryptedSecretKey: string,
  encryptedPassphrase?: string | null
) {
  return {
    apiKey: decrypt(encryptedApiKey),
    secretKey: decrypt(encryptedSecretKey),
    passphrase: encryptedPassphrase ? decrypt(encryptedPassphrase) : undefined,
  };
}
