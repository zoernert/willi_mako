"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reasoningService = exports.ReasoningService = void 0;
const advancedReasoningService_1 = __importDefault(require("../advancedReasoningService"));
const sanitizeMessages = (messages) => {
    if (!Array.isArray(messages)) {
        return [];
    }
    return messages
        .filter((message) => message && typeof message.role === 'string' && typeof message.content === 'string')
        .map((message) => ({ role: message.role, content: message.content }));
};
const mergeContextSettings = (sessionSettings, overrideSettings, useDetailedIntentAnalysis, overridePipeline) => {
    const merged = {
        ...(sessionSettings || {}),
        ...(overrideSettings || {})
    };
    if (useDetailedIntentAnalysis !== undefined) {
        merged.useDetailedIntentAnalysis = useDetailedIntentAnalysis;
    }
    if (overridePipeline) {
        merged.overridePipeline = overridePipeline;
    }
    return Object.keys(merged).length > 0 ? merged : undefined;
};
const mergePreferences = (sessionPreferences, overridePreferences, session) => {
    const preferences = {
        companiesOfInterest: sessionPreferences.companiesOfInterest,
        preferredTopics: sessionPreferences.preferredTopics
    };
    if (overridePreferences === null || overridePreferences === void 0 ? void 0 : overridePreferences.companiesOfInterest) {
        preferences.companiesOfInterest = overridePreferences.companiesOfInterest;
    }
    if (overridePreferences === null || overridePreferences === void 0 ? void 0 : overridePreferences.preferredTopics) {
        preferences.preferredTopics = overridePreferences.preferredTopics;
    }
    return {
        ...preferences,
        userId: session.userId,
        user_id: session.userId,
        sessionId: session.sessionId
    };
};
class ReasoningService {
    async generate(session, input) {
        const messages = sanitizeMessages(input.messages);
        const contextSettings = mergeContextSettings(session.contextSettings, input.contextSettingsOverride, input.useDetailedIntentAnalysis, input.overridePipeline);
        const preferences = mergePreferences(session.preferences, input.preferencesOverride, session);
        const result = await advancedReasoningService_1.default.generateReasonedResponse(input.query, messages, preferences, contextSettings);
        return {
            response: result.response,
            reasoningSteps: result.reasoningSteps,
            finalQuality: result.finalQuality,
            iterationsUsed: result.iterationsUsed,
            contextAnalysis: result.contextAnalysis,
            qaAnalysis: result.qaAnalysis,
            pipelineDecisions: result.pipelineDecisions,
            apiCallsUsed: result.apiCallsUsed,
            hybridSearchUsed: result.hybridSearchUsed,
            hybridSearchAlpha: result.hybridSearchAlpha,
            metadata: {
                sessionId: session.sessionId,
                usedDetailedIntentAnalysis: Boolean(contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.useDetailedIntentAnalysis),
                usedOverridePipeline: Boolean(input.overridePipeline),
                contextSettings,
                preferences: {
                    companiesOfInterest: preferences.companiesOfInterest,
                    preferredTopics: preferences.preferredTopics
                }
            }
        };
    }
}
exports.ReasoningService = ReasoningService;
exports.reasoningService = new ReasoningService();
//# sourceMappingURL=reasoning.service.js.map