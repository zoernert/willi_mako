"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAIKeyService = void 0;
const database_1 = require("../utils/database");
const secretCrypto_1 = require("../utils/secretCrypto");
const generative_ai_1 = require("@google/generative-ai");
exports.UserAIKeyService = {
    async setUserGeminiKey(userId, apiKey) {
        const encrypted = (0, secretCrypto_1.encryptSecret)(apiKey);
        const now = new Date();
        // Optimistic store first with unknown, then verify
        await database_1.DatabaseHelper.executeQuery(`UPDATE users
         SET gemini_api_key_encrypted = $1,
             gemini_key_status = 'unknown',
             gemini_key_set_at = $2,
             updated_at = NOW()
       WHERE id = $3`, [encrypted, now, userId]);
        const status = await this.verifyUserGeminiKey(userId);
        return status;
    },
    async deleteUserGeminiKey(userId) {
        await database_1.DatabaseHelper.executeQuery(`UPDATE users
         SET gemini_api_key_encrypted = NULL,
             gemini_key_status = 'unknown',
             gemini_key_set_at = NULL,
             gemini_key_last_verified_at = NULL,
             updated_at = NOW()
       WHERE id = $1`, [userId]);
    },
    async getUserGeminiKeyStatus(userId) {
        const row = await database_1.DatabaseHelper.executeQuerySingle(`SELECT gemini_api_key_encrypted, gemini_key_status, gemini_key_last_verified_at, system_ai_key_access
         FROM users WHERE id = $1`, [userId]);
        return {
            hasKey: !!(row === null || row === void 0 ? void 0 : row.gemini_api_key_encrypted),
            status: ((row === null || row === void 0 ? void 0 : row.gemini_key_status) || 'unknown'),
            lastVerifiedAt: (row === null || row === void 0 ? void 0 : row.gemini_key_last_verified_at) || null,
            systemKeyAllowed: (row === null || row === void 0 ? void 0 : row.system_ai_key_access) !== false,
        };
    },
    async setSystemKeyAccess(userId, allowed) {
        await database_1.DatabaseHelper.executeQuery(`UPDATE users SET system_ai_key_access = $1, updated_at = NOW() WHERE id = $2`, [allowed, userId]);
    },
    async resolveGeminiApiKey(userId) {
        const row = await database_1.DatabaseHelper.executeQuerySingle(`SELECT gemini_api_key_encrypted, gemini_key_status, system_ai_key_access FROM users WHERE id = $1`, [userId]);
        const userKey = (row === null || row === void 0 ? void 0 : row.gemini_api_key_encrypted) ? (0, secretCrypto_1.decryptSecret)(row.gemini_api_key_encrypted) : '';
        if (userKey && (row === null || row === void 0 ? void 0 : row.gemini_key_status) === 'valid') {
            return { key: userKey, source: 'user' };
        }
        if ((row === null || row === void 0 ? void 0 : row.system_ai_key_access) !== false) {
            // Use process env (system key handled by existing key manager). We return null to signal system should be used.
            return { key: null, source: 'system' };
        }
        return { key: null, source: null };
    },
    async verifyUserGeminiKey(userId) {
        const row = await database_1.DatabaseHelper.executeQuerySingle('SELECT gemini_api_key_encrypted FROM users WHERE id = $1', [userId]);
        const enc = row === null || row === void 0 ? void 0 : row.gemini_api_key_encrypted;
        if (!enc) {
            await database_1.DatabaseHelper.executeQuery(`UPDATE users SET gemini_key_status = 'unknown', gemini_key_last_verified_at = NULL WHERE id = $1`, [userId]);
            return { status: 'unknown', lastVerifiedAt: null };
        }
        const plain = (0, secretCrypto_1.decryptSecret)(enc);
        let status = 'invalid';
        let verifiedAt = null;
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(plain);
            // cheap call: get a model handle and do a tiny ping
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const res = await model.generateContent('ping');
            if (res && res.response) {
                status = 'valid';
                verifiedAt = new Date();
            }
        }
        catch (_a) {
            status = 'invalid';
            verifiedAt = new Date();
        }
        await database_1.DatabaseHelper.executeQuery(`UPDATE users SET gemini_key_status = $1, gemini_key_last_verified_at = $2, updated_at = NOW() WHERE id = $3`, [status, verifiedAt, userId]);
        return { status, lastVerifiedAt: verifiedAt };
    }
};
exports.default = exports.UserAIKeyService;
//# sourceMappingURL=userAIKeyService.js.map