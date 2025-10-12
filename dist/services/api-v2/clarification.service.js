"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clarificationService = exports.ClarificationService = void 0;
const flip_mode_1 = __importDefault(require("../flip-mode"));
class ClarificationService {
    async analyze(session, query, options = {}) {
        const analysis = await flip_mode_1.default.analyzeClarificationNeed(query, session.userId);
        const result = {
            clarificationNeeded: analysis.needsClarification,
            ambiguityScore: analysis.ambiguityScore,
            detectedTopics: analysis.detectedTopics,
            reasoning: analysis.reasoning,
            suggestedQuestions: analysis.suggestedQuestions,
            clarificationSessionId: analysis.sessionId
        };
        if (options.includeEnhancedQuery) {
            result.enhancedQuery = await flip_mode_1.default.buildEnhancedQuery(query, session.userId);
        }
        return result;
    }
}
exports.ClarificationService = ClarificationService;
exports.clarificationService = new ClarificationService();
//# sourceMappingURL=clarification.service.js.map