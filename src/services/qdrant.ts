import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://10.0.0.2:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || 'str0mdao0';
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'willi';

const qdrantClient = axios.create({
  baseURL: QDRANT_URL,
  headers: {
    'Content-Type': 'application/json',
    'api-key': QDRANT_API_KEY,
  },
});

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    text: string;
    metadata?: any;
    source?: string;
    timestamp?: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: {
    text: string;
    metadata?: any;
    source?: string;
    timestamp?: string;
  };
}

export class QdrantService {
  async createCollection(vectorSize: number = 1536) {
    try {
      const response = await qdrantClient.put(`/collections/${COLLECTION_NAME}`, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 2,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('Collection already exists');
        return { status: 'exists' };
      }
      throw error;
    }
  }

  async insertPoints(points: QdrantPoint[]) {
    try {
      const response = await qdrantClient.put(`/collections/${COLLECTION_NAME}/points`, {
        points: points,
      });
      return response.data;
    } catch (error) {
      console.error('Error inserting points:', error);
      throw error;
    }
  }

  async searchSimilar(
    queryVector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      const response = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/search`, {
        vector: queryVector,
        limit: limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });
      
      return response.data.result.map((item: any) => ({
        id: item.id,
        score: item.score,
        payload: item.payload,
      }));
    } catch (error) {
      console.error('Error searching similar vectors:', error);
      throw error;
    }
  }

  async searchByText(
    queryText: string,
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      // Convert text to vector using GeminiService
      const GeminiService = require('./gemini').default;
      const queryVector = await GeminiService.generateEmbedding(queryText);
      
      return await this.searchSimilar(queryVector, limit, scoreThreshold);
    } catch (error) {
      console.error('Error searching by text:', error);
      return [];
    }
  }

  async deletePoints(pointIds: string[]) {
    try {
      const response = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/delete`, {
        points: pointIds,
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting points:', error);
      throw error;
    }
  }

  async getCollection() {
    try {
      const response = await qdrantClient.get(`/collections/${COLLECTION_NAME}`);
      return response.data;
    } catch (error) {
      console.error('Error getting collection info:', error);
      throw error;
    }
  }

  async updatePoint(pointId: string, point: Partial<QdrantPoint>) {
    try {
      const response = await qdrantClient.put(`/collections/${COLLECTION_NAME}/points`, {
        points: [
          {
            id: pointId,
            ...point,
          },
        ],
      });
      return response.data;
    } catch (error) {
      console.error('Error updating point:', error);
      throw error;
    }
  }

  async testConnection(): Promise<void> {
    try {
      const response = await qdrantClient.get('/collections');
      console.log('Qdrant connection test successful');
    } catch (error) {
      console.error('Qdrant connection test failed:', error);
      throw error;
    }
  }

  /**
   * Store user document chunk in vector database
   */
  async storeUserDocumentChunk(
    vectorId: string,
    chunkText: string,
    documentId: string,
    userId: string,
    documentTitle: string,
    chunkIndex: number
  ): Promise<void> {
    try {
      // Generate embedding for chunk text
      const GeminiService = require('./gemini').default;
      const vector = await GeminiService.generateEmbedding(chunkText);
      
      const point: QdrantPoint = {
        id: vectorId,
        vector: vector,
        payload: {
          text: chunkText,
          source: 'user_document',
          metadata: {
            document_id: documentId,
            user_id: userId,
            document_title: documentTitle,
            chunk_index: chunkIndex,
            type: 'user_document_chunk'
          },
          timestamp: new Date().toISOString()
        }
      };
      
      await this.insertPoints([point]);
      
    } catch (error) {
      console.error('Error storing user document chunk:', error);
      throw error;
    }
  }

  /**
   * Delete a specific vector by ID
   */
  async deleteVector(vectorId: string): Promise<void> {
    try {
      await this.deletePoints([vectorId]);
    } catch (error) {
      console.error('Error deleting vector:', error);
      throw error;
    }
  }

  /**
   * Search user documents with personalized context
   */
  async searchUserDocuments(
    queryText: string,
    userId: string,
    limit: number = 5,
    scoreThreshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for query
      const GeminiService = require('./gemini').default;
      const queryVector = await GeminiService.generateEmbedding(queryText);
      
      // Search with user document filter
      const response = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/search`, {
        vector: queryVector,
        limit: limit,
        score_threshold: scoreThreshold,
        filter: {
          must: [
            {
              key: 'metadata.type',
              match: { value: 'user_document_chunk' }
            },
            {
              key: 'metadata.user_id',
              match: { value: userId }
            }
          ]
        }
      });
      
      return response.data.result || [];
      
    } catch (error) {
      console.error('Error searching user documents:', error);
      return [];
    }
  }

  /**
   * Get all vectors for a specific document
   */
  async getDocumentVectors(documentId: string): Promise<SearchResult[]> {
    try {
      const response = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/search`, {
        vector: Array(1536).fill(0), // Dummy vector for filter-only search
        limit: 1000,
        filter: {
          must: [
            {
              key: 'metadata.document_id',
              match: { value: documentId }
            }
          ]
        }
      });
      
      return response.data.result || [];
      
    } catch (error) {
      console.error('Error getting document vectors:', error);
      return [];
    }
  }

  /**
   * Search combining public and user content
   */
  async searchMixed(
    queryText: string,
    userId: string,
    includeUserContent: boolean = true,
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<{
    public_results: SearchResult[];
    user_results: SearchResult[];
  }> {
    try {
      const GeminiService = require('./gemini').default;
      const queryVector = await GeminiService.generateEmbedding(queryText);
      
      // Search public content
      const publicResponse = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/search`, {
        vector: queryVector,
        limit: Math.ceil(limit / 2),
        score_threshold: scoreThreshold,
        filter: {
          must_not: [
            {
              key: 'metadata.type',
              match: { value: 'user_document_chunk' }
            }
          ]
        }
      });
      
      let userResults: SearchResult[] = [];
      
      if (includeUserContent) {
        // Search user content
        const userResponse = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/search`, {
          vector: queryVector,
          limit: Math.ceil(limit / 2),
          score_threshold: scoreThreshold,
          filter: {
            must: [
              {
                key: 'metadata.type',
                match: { value: 'user_document_chunk' }
              },
              {
                key: 'metadata.user_id',
                match: { value: userId }
              }
            ]
          }
        });
        
        userResults = userResponse.data.result || [];
      }
      
      return {
        public_results: publicResponse.data.result || [],
        user_results: userResults
      };
      
    } catch (error) {
      console.error('Error in mixed search:', error);
      return {
        public_results: [],
        user_results: []
      };
    }
  }
}

export default new QdrantService();
