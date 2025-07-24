import { QdrantClient } from '@qdrant/js-client-rest';
import { UserDocument } from '../types/workspace';
import { v4 as uuidv4 } from 'uuid';
import geminiService from './gemini';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'ewilli';

export class QdrantService {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({ 
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      checkCompatibility: false  // Bypass version compatibility check
    });
    this.ensureCollection();
  }

  // Static method for initialization
  static async createCollection() {
    const client = new QdrantClient({ 
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      checkCompatibility: false  // Bypass version compatibility check
    });
    try {
      const result = await client.getCollections();
      const collectionExists = result.collections.some(
        (collection: any) => collection.name === QDRANT_COLLECTION_NAME
      );

      if (!collectionExists) {
        await client.createCollection(QDRANT_COLLECTION_NAME, {
          vectors: { size: 768, distance: 'Cosine' }, // Assuming embedding size of 768
        });
        console.log(`Collection ${QDRANT_COLLECTION_NAME} created.`);
      }
    } catch (error) {
      console.error('Error creating Qdrant collection:', error);
    }
  }

  // Static method for searching by text (used in faq.ts)
  static async searchByText(query: string, limit: number = 10, scoreThreshold: number = 0.5) {
    const client = new QdrantClient({ 
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      checkCompatibility: false  // Bypass version compatibility check
    });
    try {
      const queryVector = await geminiService.generateEmbedding(query);
      const results = await client.search(QDRANT_COLLECTION_NAME, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
      });
      return results;
    } catch (error) {
      console.error('Error searching by text:', error);
      return [];
    }
  }

  private async ensureCollection() {
    try {
      const result = await this.client.getCollections();
      const collectionExists = result.collections.some(
        (collection: any) => collection.name === QDRANT_COLLECTION_NAME
      );

      if (!collectionExists) {
        await this.client.createCollection(QDRANT_COLLECTION_NAME, {
          vectors: { size: 768, distance: 'Cosine' }, // Assuming embedding size of 768
        });
        console.log(`Collection ${QDRANT_COLLECTION_NAME} created.`);
      }
    } catch (error) {
      console.error('Error ensuring Qdrant collection:', error);
    }
  }

  async upsertDocument(document: UserDocument, text: string) {
    const embedding = await geminiService.generateEmbedding(text);

    await this.client.upsert(QDRANT_COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: document.id,
          vector: embedding,
          payload: {
            user_id: document.user_id,
            document_id: document.id,
            title: document.title,
            created_at: document.created_at,
            text_content_sample: text.substring(0, 200),
          },
        },
      ],
    });
  }

  async deleteDocument(documentId: string) {
    await this.client.delete(QDRANT_COLLECTION_NAME, {
      points: [documentId],
    });
  }

  async search(userId: string, queryText: string, limit: number = 10) {
    const queryVector = await geminiService.generateEmbedding(queryText);

    const results = await this.client.search(QDRANT_COLLECTION_NAME, {
      vector: queryVector,
      limit,
      filter: {
        must: [
          {
            key: 'user_id',
            match: {
              value: userId,
            },
          },
        ],
      },
    });

    return results;
  }

  // Instance method for searching by text (used in message-analyzer and quiz services)
  async searchByText(query: string, limit: number = 10, scoreThreshold: number = 0.5) {
    try {
      const queryVector = await geminiService.generateEmbedding(query);
      const results = await this.client.search(QDRANT_COLLECTION_NAME, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
      });
      return results;
    } catch (error) {
      console.error('Error searching by text:', error);
      return [];
    }
  }

  // Method for storing user document chunks
  async storeUserDocumentChunk(
    vectorId: string,
    text: string,
    documentId: string,
    userId: string,
    title: string,
    chunkIndex: number
  ) {
    try {
      const embedding = await geminiService.generateEmbedding(text);
      await this.client.upsert(QDRANT_COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: vectorId,
            vector: embedding,
            payload: {
              user_id: userId,
              document_id: documentId,
              title,
              chunk_index: chunkIndex,
              text,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Error storing document chunk:', error);
      throw error;
    }
  }

  // Method for deleting a vector by ID
  async deleteVector(vectorId: string) {
    try {
      await this.client.delete(QDRANT_COLLECTION_NAME, {
        points: [vectorId],
      });
    } catch (error) {
      console.error('Error deleting vector:', error);
      throw error;
    }
  }
}