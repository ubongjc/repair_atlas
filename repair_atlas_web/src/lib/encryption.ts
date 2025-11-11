import crypto from 'crypto';

/**
 * Server-side encryption utilities
 * Note: Client-side encryption is handled by iOS CryptoService
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  // Ensure key is 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decrypt(encrypted: {
  ciphertext: string;
  iv: string;
  authTag: string;
}): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'hex');
  const authTag = Buffer.from(encrypted.authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function encryptSensitiveField(value: string): string {
  const encrypted = encrypt(value);
  return JSON.stringify(encrypted);
}

export function decryptSensitiveField(encryptedValue: string): string {
  try {
    const parsed = JSON.parse(encryptedValue);
    return decrypt(parsed);
  } catch (error) {
    throw new Error('Failed to decrypt sensitive field');
  }
}

// For encrypting database fields that contain sensitive PII
export function encryptPII(data: Record<string, unknown>): Record<string, string> {
  const encrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      encrypted[key] = encryptSensitiveField(String(value));
    }
  }

  return encrypted;
}

export function decryptPII(encryptedData: Record<string, string>): Record<string, string> {
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(encryptedData)) {
    try {
      decrypted[key] = decryptSensitiveField(value);
    } catch (error) {
      // Field might not be encrypted, return as-is
      decrypted[key] = value;
    }
  }

  return decrypted;
}
