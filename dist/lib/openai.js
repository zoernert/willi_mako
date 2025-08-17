"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
const openai_1 = __importDefault(require("openai"));
// Initialize OpenAI client
exports.openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// Fallback for development if no API key is provided
if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not found in environment variables. AI features will be disabled.');
}
exports.default = exports.openai;
//# sourceMappingURL=openai.js.map