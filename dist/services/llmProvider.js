"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveLLMProvider = getActiveLLMProvider;
exports.getActiveLLMModel = getActiveLLMModel;
exports.getActiveLLMInfo = getActiveLLMInfo;
const gemini_1 = __importDefault(require("./gemini"));
const mistral_1 = require("./mistral");
const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
function getLLMProvider() {
    return PROVIDER === 'mistral' ? 'mistral' : 'gemini';
}
const mistralService = new mistral_1.MistralService();
// Keep track of actual provider/model used on the last successful call (for accurate metadata)
let lastProviderUsed = null;
let lastModelUsed = null;
function shouldFallbackToGeminiOnMistralError(error) {
    // Be safe: fall back on most common transient/quotas/network issues
    const msg = typeof (error === null || error === void 0 ? void 0 : error.message) === 'string' ? error.message.toLowerCase() : '';
    const is429 = msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit');
    const isCapacity = msg.includes('capacity') || msg.includes('service_tier_capacity_exceeded');
    const is5xx = /\b5\d{2}\b/.test(msg) || msg.includes('internal server error');
    const isNetwork = msg.includes('fetch') || msg.includes('network');
    // Default to true for mistral-specific errors we can't classify
    return is429 || isCapacity || is5xx || isNetwork || true;
}
async function callWithFallback(methodName, args) {
    var _a, _b, _c, _d, _e, _f;
    const active = getLLMProvider();
    // If Mistral is configured, try it first and fall back to Gemini when needed
    if (active === 'mistral') {
        try {
            const result = await mistralService[methodName](...args);
            lastProviderUsed = 'mistral';
            lastModelUsed = mistralService.getLastUsedModel();
            return result;
        }
        catch (err) {
            // Only log and fall back – never break the chat flow due to Mistral
            if (shouldFallbackToGeminiOnMistralError(err)) {
                console.warn(`Mistral error – falling back to Gemini for ${String(methodName)}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
                const result = await gemini_1.default[methodName](...args);
                lastProviderUsed = 'gemini';
                lastModelUsed = (_c = (_b = (_a = gemini_1.default).getLastUsedModel) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : null;
                return result;
            }
            throw err;
        }
    }
    // Default provider is Gemini
    const result = await gemini_1.default[methodName](...args);
    lastProviderUsed = 'gemini';
    lastModelUsed = (_f = (_e = (_d = gemini_1.default).getLastUsedModel) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : null;
    return result;
}
const llm = {
    generateResponse: (...args) => callWithFallback('generateResponse', args),
    generateText: (...args) => callWithFallback('generateText', args),
    generateSearchQueries: (...args) => callWithFallback('generateSearchQueries', args),
    synthesizeContext: (...args) => callWithFallback('synthesizeContext', args),
    synthesizeContextWithChunkTypes: (...args) => callWithFallback('synthesizeContextWithChunkTypes', args),
    generateResponseWithUserContext: (...args) => callWithFallback('generateResponseWithUserContext', args),
    generateChatTitle: (...args) => callWithFallback('generateChatTitle', args),
    generateStructuredOutput: (...args) => callWithFallback('generateStructuredOutput', args),
    generateTagsForNote: (...args) => callWithFallback('generateTagsForNote', args),
    generateTagsForDocument: (...args) => callWithFallback('generateTagsForDocument', args),
    generateMultipleChoiceQuestion: (...args) => callWithFallback('generateMultipleChoiceQuestion', args),
    generateQuizQuestions: (...args) => callWithFallback('generateQuizQuestions', args),
    evaluateAnswerWithExplanation: (...args) => callWithFallback('evaluateAnswerWithExplanation', args),
    generateHypotheticalAnswer: (...args) => callWithFallback('generateHypotheticalAnswer', args),
    generateFAQContent: (...args) => callWithFallback('generateFAQContent', args),
    enhanceFAQWithContext: (...args) => callWithFallback('enhanceFAQWithContext', args),
    getLastUsedModel: () => {
        var _a, _b, _c;
        return lastModelUsed !== null && lastModelUsed !== void 0 ? lastModelUsed : (getLLMProvider() === 'mistral'
            ? mistralService.getLastUsedModel()
            : (_c = (_b = (_a = gemini_1.default).getLastUsedModel) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : null);
    },
};
function getActiveLLMProvider() { return (lastProviderUsed || getLLMProvider()); }
function getActiveLLMModel() { return lastModelUsed !== null && lastModelUsed !== void 0 ? lastModelUsed : llm.getLastUsedModel(); }
function getActiveLLMInfo() {
    return { provider: getActiveLLMProvider(), model: getActiveLLMModel() };
}
exports.default = llm;
//# sourceMappingURL=llmProvider.js.map