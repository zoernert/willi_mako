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
function selected() {
    return getLLMProvider() === 'mistral' ? mistralService : gemini_1.default;
}
const llm = {
    generateResponse: (...args) => selected().generateResponse(...args),
    generateText: (...args) => selected().generateText(...args),
    generateSearchQueries: (...args) => selected().generateSearchQueries(...args),
    synthesizeContext: (...args) => selected().synthesizeContext(...args),
    synthesizeContextWithChunkTypes: (...args) => selected().synthesizeContextWithChunkTypes(...args),
    generateResponseWithUserContext: (...args) => selected().generateResponseWithUserContext(...args),
    generateChatTitle: (...args) => selected().generateChatTitle(...args),
    generateStructuredOutput: (...args) => selected().generateStructuredOutput(...args),
    generateTagsForNote: (...args) => selected().generateTagsForNote(...args),
    generateTagsForDocument: (...args) => selected().generateTagsForDocument(...args),
    generateMultipleChoiceQuestion: (...args) => selected().generateMultipleChoiceQuestion(...args),
    generateQuizQuestions: (...args) => selected().generateQuizQuestions(...args),
    evaluateAnswerWithExplanation: (...args) => selected().evaluateAnswerWithExplanation(...args),
    generateHypotheticalAnswer: (...args) => selected().generateHypotheticalAnswer(...args),
    generateFAQContent: (...args) => selected().generateFAQContent(...args),
    enhanceFAQWithContext: (...args) => selected().enhanceFAQWithContext(...args),
    getLastUsedModel: () => selected().getLastUsedModel(),
};
function getActiveLLMProvider() { return getLLMProvider(); }
function getActiveLLMModel() {
    var _a, _b, _c;
    return getLLMProvider() === 'mistral'
        ? mistralService.getLastUsedModel()
        : (_c = (_b = (_a = gemini_1.default).getLastUsedModel) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : null;
}
function getActiveLLMInfo() {
    return { provider: getActiveLLMProvider(), model: getActiveLLMModel() };
}
exports.default = llm;
//# sourceMappingURL=llmProvider.js.map