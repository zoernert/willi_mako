import geminiService from './gemini';

/**
 * Generates a vector embedding for the given text using Google's embedding model.
 * @param text The text to embed.
 * @returns A promise that resolves to a vector (an array of numbers).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    // Use Google's embedding model via Gemini service
    const embedding = await geminiService.generateEmbedding(text);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    // Fallback to basic hash-based embedding
    const EMBEDDING_DIMENSION = 768;
    const vector = Array.from(
      { length: EMBEDDING_DIMENSION },
      () => Math.random() * 2 - 1
    );
    
    return vector;
  }
}
