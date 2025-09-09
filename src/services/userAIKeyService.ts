import { DatabaseHelper } from '../utils/database';
import { encryptSecret, decryptSecret } from '../utils/secretCrypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type KeyStatus = 'unknown' | 'valid' | 'invalid';

export const UserAIKeyService = {
  async setUserGeminiKey(userId: string, apiKey: string) {
    const encrypted = encryptSecret(apiKey);
    const now = new Date();
    // Optimistic store first with unknown, then verify
    await DatabaseHelper.executeQuery(
      `UPDATE users
         SET gemini_api_key_encrypted = $1,
             gemini_key_status = 'unknown',
             gemini_key_set_at = $2,
             updated_at = NOW()
       WHERE id = $3`,
      [encrypted, now, userId]
    );

    const status = await this.verifyUserGeminiKey(userId);
    return status;
  },

  async deleteUserGeminiKey(userId: string) {
    await DatabaseHelper.executeQuery(
      `UPDATE users
         SET gemini_api_key_encrypted = NULL,
             gemini_key_status = 'unknown',
             gemini_key_set_at = NULL,
             gemini_key_last_verified_at = NULL,
             updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  },

  async getUserGeminiKeyStatus(userId: string) {
    const row = await DatabaseHelper.executeQuerySingle<{
      gemini_api_key_encrypted: string | null;
      gemini_key_status: KeyStatus;
      gemini_key_last_verified_at: Date | null;
      system_ai_key_access: boolean;
    }>(
      `SELECT gemini_api_key_encrypted, gemini_key_status, gemini_key_last_verified_at, system_ai_key_access
         FROM users WHERE id = $1`,
      [userId]
    );
    return {
      hasKey: !!row?.gemini_api_key_encrypted,
      status: (row?.gemini_key_status || 'unknown') as KeyStatus,
      lastVerifiedAt: row?.gemini_key_last_verified_at || null,
      systemKeyAllowed: row?.system_ai_key_access !== false,
    };
  },

  async setSystemKeyAccess(userId: string, allowed: boolean) {
    await DatabaseHelper.executeQuery(
      `UPDATE users SET system_ai_key_access = $1, updated_at = NOW() WHERE id = $2`,
      [allowed, userId]
    );
  },

  async resolveGeminiApiKey(userId: string): Promise<{ key: string | null; source: 'user' | 'system' | null }>{
    const row = await DatabaseHelper.executeQuerySingle<{
      gemini_api_key_encrypted: string | null;
      gemini_key_status: KeyStatus;
      system_ai_key_access: boolean;
    }>(
      `SELECT gemini_api_key_encrypted, gemini_key_status, system_ai_key_access FROM users WHERE id = $1`,
      [userId]
    );

    const userKey = row?.gemini_api_key_encrypted ? decryptSecret(row.gemini_api_key_encrypted) : '';
    if (userKey && row?.gemini_key_status === 'valid') {
      return { key: userKey, source: 'user' };
    }
    if (row?.system_ai_key_access !== false) {
      // Use process env (system key handled by existing key manager). We return null to signal system should be used.
      return { key: null, source: 'system' };
    }
    return { key: null, source: null };
  },

  async verifyUserGeminiKey(userId: string): Promise<{ status: KeyStatus; lastVerifiedAt: Date | null }>{
    const row = await DatabaseHelper.executeQuerySingle<{ gemini_api_key_encrypted: string | null }>(
      'SELECT gemini_api_key_encrypted FROM users WHERE id = $1',
      [userId]
    );
    const enc = row?.gemini_api_key_encrypted;
    if (!enc) {
      await DatabaseHelper.executeQuery(
        `UPDATE users SET gemini_key_status = 'unknown', gemini_key_last_verified_at = NULL WHERE id = $1`,
        [userId]
      );
      return { status: 'unknown', lastVerifiedAt: null };
    }
    const plain = decryptSecret(enc);
    let status: KeyStatus = 'invalid';
    let verifiedAt: Date | null = null;
    try {
      const genAI = new GoogleGenerativeAI(plain);
      // cheap call: get a model handle and do a tiny ping
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const res = await model.generateContent('ping');
      if (res && res.response) {
        status = 'valid';
        verifiedAt = new Date();
      }
    } catch {
      status = 'invalid';
      verifiedAt = new Date();
    }
    await DatabaseHelper.executeQuery(
      `UPDATE users SET gemini_key_status = $1, gemini_key_last_verified_at = $2, updated_at = NOW() WHERE id = $3`,
      [status, verifiedAt, userId]
    );
    return { status, lastVerifiedAt: verifiedAt };
  }
};

export default UserAIKeyService;
