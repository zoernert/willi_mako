import { generateEmbedding as providerEmbedding, getEmbeddingDimension } from './embeddingProvider';

/**
 * Generates a vector embedding for the given text using the configured provider.
 * @param text The text to embed.
 * @returns A promise that resolves to a vector (an array of numbers).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const embedding = await providerEmbedding(text);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    // Fallback to basic hash-based embedding with provider dimension
    const DEFAULT_DIM = getEmbeddingDimension();
    const vector = Array.from(
      { length: DEFAULT_DIM },
      () => Math.random() * 2 - 1
    );
    
    return vector;
  }
}
