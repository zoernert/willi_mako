// Extended Qdrant Service for Community Hub
// CR-COMMUNITY-HUB-001
// Autor: AI Assistant
// Datum: 2025-08-09

import { QdrantClient } from '@qdrant/js-client-rest';
import geminiService from './gemini';
import { CommunityVectorPoint } from '../types/community';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COMMUNITY_COLLECTION = process.env.QDRANT_COMMUNITY_COLLECTION || 'community_content';

export class CommunityQdrantService {
  private client: QdrantClient;

  constructor(private collectionName: string = QDRANT_COMMUNITY_COLLECTION) {
    this.client = new QdrantClient({ 
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      checkCompatibility: false
    });
    this.ensureCollection();
  }

  /**
   * Ensure the community collection exists
   */
  private async ensureCollection() {
    try {
      const result = await this.client.getCollections();
      const collectionExists = result.collections.some(
        (collection: any) => collection.name === this.collectionName
      );

      if (!collectionExists) {
        await this.client.createCollection(this.collectionName, {
          vectors: { size: 768, distance: 'Cosine' },
        });
        console.log(`Community collection ${this.collectionName} created.`);
      }
    } catch (error) {
      console.error('Error ensuring community collection:', error);
    }
  }

  /**
   * Upsert a vector point for community content
   */
  async upsertVector(content: string, payload: CommunityVectorPoint): Promise<void> {
    try {
      const embedding = await geminiService.generateEmbedding(content);
      
      // Create a deterministic UUID for this vector point using crypto
      const crypto = require('crypto');
      const uniqueString = `${payload.thread_id}_${payload.section_key}_${payload.proposal_id || 'main'}`;
      const hash = crypto.createHash('sha256').update(uniqueString).digest('hex');
      
      // Convert hash to UUID format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
      const pointId = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16), // Version 4 UUID
        ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20), // Variant bits
        hash.substring(20, 32)
      ].join('-');

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: {
              ...payload,
              text_content_sample: content.substring(0, 200),
              vector_id_source: uniqueString, // Store original ID for debugging
            },
          },
        ],
      });
    } catch (error) {
      console.error('Error upserting community vector:', error);
      throw error;
    }
  }

  /**
   * Search community content by text query
   */
  async searchByText(query: string, limit: number = 10, scoreThreshold: number = 0.5): Promise<any[]> {
    try {
      const queryVector = await geminiService.generateEmbedding(query);
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
      });
      return results;
    } catch (error) {
      console.error('Error searching community content:', error);
      return [];
    }
  }

  /**
   * Delete all vectors for a specific thread
   */
  async deleteThreadVectors(threadId: string): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        filter: {
          must: [{ key: 'thread_id', match: { value: threadId } }]
        }
      });
    } catch (error) {
      console.error('Error deleting thread vectors:', error);
      throw error;
    }
  }

  /**
   * Delete specific section vectors
   */
  async deleteSectionVectors(threadId: string, sectionKey: string, proposalId?: string): Promise<void> {
    try {
      const filter: any = {
        must: [
          { key: 'thread_id', match: { value: threadId } },
          { key: 'section_key', match: { value: sectionKey } }
        ]
      };

      if (proposalId) {
        filter.must.push({ key: 'proposal_id', match: { value: proposalId } });
      }

      await this.client.delete(this.collectionName, { filter });
    } catch (error) {
      console.error('Error deleting section vectors:', error);
      throw error;
    }
  }

  /**
   * Search with filters
   */
  async searchWithFilters(
    query: string, 
    filters: { 
      thread_ids?: string[];
      section_keys?: string[];
      exclude_proposals?: boolean;
    } = {},
    limit: number = 10
  ): Promise<any[]> {
    try {
      const queryVector = await geminiService.generateEmbedding(query);
      
      const filterConditions: any[] = [];

      if (filters.thread_ids && filters.thread_ids.length > 0) {
        filterConditions.push({
          key: 'thread_id',
          match: { any: filters.thread_ids }
        });
      }

      if (filters.section_keys && filters.section_keys.length > 0) {
        filterConditions.push({
          key: 'section_key',
          match: { any: filters.section_keys }
        });
      }

      if (filters.exclude_proposals) {
        filterConditions.push({
          key: 'section_key',
          match: { except: ['proposal'] }
        });
      }

      const searchParams: any = {
        vector: queryVector,
        limit,
        score_threshold: 0.3
      };

      if (filterConditions.length > 0) {
        searchParams.filter = { must: filterConditions };
      }

      const results = await this.client.search(this.collectionName, searchParams);
      return results;
    } catch (error) {
      console.error('Error searching with filters:', error);
      return [];
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error('Error getting collection info:', error);
      return null;
    }
  }

  /**
   * Batch update multiple sections of a thread
   */
  async batchUpsertSections(threadId: string, sections: Array<{
    section_key: string;
    content: string;
    proposal_id?: string;
  }>): Promise<void> {
    const batchPromises = sections.map(section => {
      const payload: CommunityVectorPoint = {
        thread_id: threadId,
        section_key: section.section_key as any,
        content: section.content,
        proposal_id: section.proposal_id,
        created_at: new Date().toISOString()
      };
      return this.upsertVector(section.content, payload);
    });

    try {
      await Promise.allSettled(batchPromises);
      console.log(`Batch upserted ${sections.length} sections for thread ${threadId}`);
    } catch (error) {
      console.error('Error in batch upsert:', error);
      throw error;
    }
  }

  /**
   * Delete specific proposal vector
   */
  async deleteProposalVector(threadId: string, proposalId: string): Promise<void> {
    try {
      const pointId = `${threadId}_proposal_${proposalId}`;
      await this.client.delete(this.collectionName, {
        points: [pointId]
      });
    } catch (error) {
      console.error('Error deleting proposal vector:', error);
    }
  }

  /**
   * Get collection stats for monitoring
   */
  async getCollectionStats(): Promise<any> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        vectors_count: info.vectors_count,
        indexed_vectors_count: info.indexed_vectors_count,
        points_count: info.points_count,
        status: info.status
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      return null;
    }
  }
}
