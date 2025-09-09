"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const crypto_1 = __importDefault(require("crypto"));
// Simple AES-256-CBC encryption/decryption reusing EMAIL_ENCRYPTION_KEY or a dedicated key
const algorithm = 'aes-256-cbc';
const keyMaterial = process.env.AI_SECRET_ENCRYPTION_KEY || process.env.EMAIL_ENCRYPTION_KEY || 'default-key-change-in-production';
const key = crypto_1.default.createHash('sha256').update(keyMaterial).digest();
function encryptSecret(plain) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(plain, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decryptSecret(encrypted) {
    if (!encrypted)
        return '';
    try {
        const [ivHex, cipherHex] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(Buffer.from(cipherHex, 'hex'));
        decrypted += decipher.final('utf8');
        return decrypted.toString();
    }
    catch (_a) {
        return '';
    }
}
//# sourceMappingURL=secretCrypto.js.map