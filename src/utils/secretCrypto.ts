import crypto from 'crypto';

// Simple AES-256-CBC encryption/decryption reusing EMAIL_ENCRYPTION_KEY or a dedicated key
const algorithm = 'aes-256-cbc';
const keyMaterial = process.env.AI_SECRET_ENCRYPTION_KEY || process.env.EMAIL_ENCRYPTION_KEY || 'default-key-change-in-production';
const key = crypto.createHash('sha256').update(keyMaterial).digest();

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plain, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptSecret(encrypted?: string | null): string {
  if (!encrypted) return '';
  try {
    const [ivHex, cipherHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(Buffer.from(cipherHex, 'hex')) as any;
    decrypted += decipher.final('utf8');
    return decrypted.toString();
  } catch {
    return '';
  }
}
