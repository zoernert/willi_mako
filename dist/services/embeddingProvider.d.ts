export declare function getEmbeddingProvider(): 'gemini' | 'mistral';
export declare function getEmbeddingDimension(): number;
export declare function getCollectionName(baseCollection: string): string;
export declare function generateEmbedding(text: string): Promise<number[]>;
export declare function generateHypotheticalAnswer(query: string): Promise<string>;
//# sourceMappingURL=embeddingProvider.d.ts.map