"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
const embeddingProvider_1 = require("./embeddingProvider");
/**
 * Generates a vector embedding for the given text using the configured provider.
 * @param text The text to embed.
 * @returns A promise that resolves to a vector (an array of numbers).
 */
async function getEmbedding(text) {
    try {
        const embedding = await (0, embeddingProvider_1.generateEmbedding)(text);
        return embedding;
    }
    catch (error) {
        console.error('Error generating embedding:', error);
        // Fallback to basic hash-based embedding with provider dimension
        const DEFAULT_DIM = (0, embeddingProvider_1.getEmbeddingDimension)();
        const vector = Array.from({ length: DEFAULT_DIM }, () => Math.random() * 2 - 1);
        return vector;
    }
}
//# sourceMappingURL=embedding.js.map