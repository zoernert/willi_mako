"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveLLMProvider = getActiveLLMProvider;
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
};
function getActiveLLMProvider() { return getLLMProvider(); }
exports.default = llm;
//# sourceMappingURL=llmProvider.js.map