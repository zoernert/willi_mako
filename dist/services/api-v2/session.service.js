"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = exports.SessionService = void 0;
const crypto_1 = require("crypto");
const database_1 = require("../../utils/database");
const workspaceService_1 = require("../workspaceService");
const user_repository_1 = require("../../modules/user/user.repository");
const session_repository_1 = require("./repositories/session.repository");
const errorHandler_1 = require("../../middleware/errorHandler");
const ensureChatColumns_1 = require("../../routes/utils/ensureChatColumns");
const DEFAULT_SESSION_TTL_MINUTES = 60 * 24 * 30; // 30 Tage
const DEFAULT_WORKSPACE_PRIORITY = 'medium';
class SessionService {
    constructor(repository = new session_repository_1.MongoSessionRepository(), workspaceService = new workspaceService_1.WorkspaceService(), userPreferencesRepository = new user_repository_1.UserPreferencesRepository()) {
        this.repository = repository;
        this.workspaceService = workspaceService;
        this.userPreferencesRepository = userPreferencesRepository;
    }
    async createSession(input) {
        var _a, _b;
        const sessionId = (0, crypto_1.randomUUID)();
        const now = new Date();
        const ttlMinutes = (_a = input.ttlMinutes) !== null && _a !== void 0 ? _a : Number(process.env.API_V2_SESSION_TTL_MINUTES || DEFAULT_SESSION_TTL_MINUTES);
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);
        const policyFlags = await this.loadPolicyFlags(input.userId);
        const workspaceContext = await this.loadWorkspaceContext(input.userId);
        const preferences = await this.loadUserPreferences(input.userId, input.preferences);
        const legacyChatId = (_b = input.legacyChatId) !== null && _b !== void 0 ? _b : await this.ensureLegacyChat(input.userId);
        const sessionDocument = {
            sessionId,
            userId: input.userId,
            legacyChatId,
            preferences,
            contextSettings: input.contextSettings,
            workspaceContext,
            policyFlags,
            metadata: {
                createdBy: 'api-v2',
                version: 'v1',
                sourceIp: input.sourceIp,
                userAgent: input.userAgent
            },
            createdAt: now,
            updatedAt: now,
            expiresAt
        };
        await this.repository.save(sessionDocument);
        return this.toEnvelope(sessionDocument);
    }
    async getSession(sessionId) {
        const session = await this.repository.findById(sessionId);
        if (!session) {
            throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
        }
        return this.toEnvelope(session);
    }
    async deleteSession(sessionId) {
        await this.repository.delete(sessionId);
    }
    async touchSession(sessionId) {
        const session = await this.repository.findById(sessionId);
        if (!session) {
            return;
        }
        session.updatedAt = new Date();
        await this.repository.save(session);
    }
    async loadPolicyFlags(userId) {
        const row = await database_1.DatabaseHelper.executeQuerySingle('SELECT role, can_access_cs30 FROM users WHERE id = $1', [userId]);
        if (!row) {
            throw new errorHandler_1.AppError('Benutzer wurde nicht gefunden', 404);
        }
        return {
            role: row.role,
            canAccessCs30: Boolean(row.can_access_cs30)
        };
    }
    async loadWorkspaceContext(userId) {
        var _a, _b;
        const settings = await this.workspaceService.getUserWorkspaceSettings(userId);
        return {
            aiContextEnabled: Boolean(settings.ai_context_enabled),
            storageLimitMb: (_a = settings.storage_limit_mb) !== null && _a !== void 0 ? _a : 0,
            storageUsedMb: (_b = settings.storage_used_mb) !== null && _b !== void 0 ? _b : 0,
            workspacePriority: DEFAULT_WORKSPACE_PRIORITY,
            features: {
                autoTagging: Boolean(settings.auto_tag_enabled),
                contextOverridesAllowed: true
            }
        };
    }
    async loadUserPreferences(userId, overrides) {
        var _a, _b;
        const prefs = await this.userPreferencesRepository.getUserPreferences(userId);
        const base = {
            companiesOfInterest: (prefs === null || prefs === void 0 ? void 0 : prefs.companies_of_interest) || [],
            preferredTopics: (prefs === null || prefs === void 0 ? void 0 : prefs.preferred_topics) || []
        };
        return {
            companiesOfInterest: (_a = overrides === null || overrides === void 0 ? void 0 : overrides.companiesOfInterest) !== null && _a !== void 0 ? _a : base.companiesOfInterest,
            preferredTopics: (_b = overrides === null || overrides === void 0 ? void 0 : overrides.preferredTopics) !== null && _b !== void 0 ? _b : base.preferredTopics
        };
    }
    async ensureLegacyChat(userId) {
        if (!userId) {
            throw new errorHandler_1.AppError('Benutzer-ID fehlt für Session-Aufbau', 400);
        }
        await (0, ensureChatColumns_1.ensureChatColumns)();
        const title = `API v2 Session ${new Date().toISOString().slice(0, 10)}`;
        const result = await database_1.DatabaseHelper.executeQuerySingle(`INSERT INTO chats (user_id, title, metadata)
       VALUES ($1, $2, jsonb_build_object('apiV2Session', 'true'))
       RETURNING id`, [userId, title]);
        if (!(result === null || result === void 0 ? void 0 : result.id)) {
            throw new errorHandler_1.AppError('Legacy-Chat konnte nicht erstellt werden', 500);
        }
        return result.id;
    }
    toEnvelope(document) {
        return {
            sessionId: document.sessionId,
            userId: document.userId,
            legacyChatId: document.legacyChatId,
            workspaceContext: document.workspaceContext,
            policyFlags: document.policyFlags,
            preferences: document.preferences,
            contextSettings: document.contextSettings,
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
            expiresAt: document.expiresAt.toISOString()
        };
    }
}
exports.SessionService = SessionService;
exports.sessionService = new SessionService();
//# sourceMappingURL=session.service.js.map