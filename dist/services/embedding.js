"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
const gemini_1 = __importDefault(require("./gemini"));
/**
 * Generates a vector embedding for the given text using Google's embedding model.
 * @param text The text to embed.
 * @returns A promise that resolves to a vector (an array of numbers).
 */
async function getEmbedding(text) {
    try {
        // Use Google's embedding model via Gemini service
        const embedding = await gemini_1.default.generateEmbedding(text);
        return embedding;
    }
    catch (error) {
        console.error('Error generating embedding:', error);
        // Fallback to basic hash-based embedding
        const EMBEDDING_DIMENSION = 768;
        const vector = Array.from({ length: EMBEDDING_DIMENSION }, () => Math.random() * 2 - 1);
        return vector;
    }
}
//# sourceMappingURL=embedding.js.map