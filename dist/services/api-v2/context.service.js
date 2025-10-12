"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextService = exports.ContextService = void 0;
const contextManager_1 = __importDefault(require("../contextManager"));
const sanitizeMessages = (messages) => {
    if (!Array.isArray(messages)) {
        return [];
    }
    return messages
        .filter((message) => message && typeof message.role === 'string' && typeof message.content === 'string')
        .map((message) => ({ role: message.role, content: message.content }));
};
const mergeContextSettings = (sessionSettings, overrideSettings) => {
    if (!sessionSettings && !overrideSettings) {
        return undefined;
    }
    return {
        ...(sessionSettings || {}),
        ...(overrideSettings || {})
    };
};
const toManagerSettings = (settings) => {
    var _a, _b, _c, _d, _e, _f;
    if (!settings) {
        return undefined;
    }
    const managerSettings = {
        useWorkspaceOnly: (_a = settings.useWorkspaceOnly) !== null && _a !== void 0 ? _a : false,
        workspacePriority: (_b = settings.workspacePriority) !== null && _b !== void 0 ? _b : 'medium',
        includeUserDocuments: (_c = settings.includeUserDocuments) !== null && _c !== void 0 ? _c : true,
        includeUserNotes: (_d = settings.includeUserNotes) !== null && _d !== void 0 ? _d : true,
        includeSystemKnowledge: (_e = settings.includeSystemKnowledge) !== null && _e !== void 0 ? _e : true,
        includeM2CRoles: (_f = settings.includeM2CRoles) !== null && _f !== void 0 ? _f : false
    };
    return managerSettings;
};
class ContextService {
    async resolve(session, query, options = {}) {
        const messages = sanitizeMessages(options.messages);
        const contextSettings = mergeContextSettings(session.contextSettings, options.contextSettingsOverride);
        const managerSettings = toManagerSettings(contextSettings);
        const result = await contextManager_1.default.determineOptimalContext(query, session.userId, messages, managerSettings);
        return {
            contextSettingsUsed: contextSettings,
            decision: result.contextDecision,
            publicContext: result.publicContext,
            userContext: result.userContext
        };
    }
}
exports.ContextService = ContextService;
exports.contextService = new ContextService();
//# sourceMappingURL=context.service.js.map