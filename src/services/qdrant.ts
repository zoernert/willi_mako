import { QdrantClient } from '@qdrant/js-client-rest';
import { UserDocument } from '../types/workspace';
import { QueryAnalysisService, QueryAnalysisResult } from './queryAnalysisService';
import { generateEmbedding as providerEmbedding, generateHypotheticalAnswer as providerHyde } from './embeddingProvider';
import { getCollectionName, getEmbeddingDimension, getEmbeddingProvider } from './embeddingProvider';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Provider selection and derived config (centralized via embeddingProvider)
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'ewilli';
const QDRANT_COLLECTION_NAME = getCollectionName(BASE_COLLECTION);
const COLLECTION_EMBED_DIM = getEmbeddingDimension();
const EMBEDDING_PROVIDER = getEmbeddingProvider();
// CR-CS30: Add cs30 collection constant (unchanged)
const CS30_COLLECTION_NAME = process.env.CS30_COLLECTION || 'cs30';

export class QdrantService {
  private client: QdrantClient;
  private abbreviationIndex: Map<string, string> = new Map();
  // Add flag for hybrid search capability
  private hybridSearchSupported: boolean = false;

  constructor() {
    this.client = new QdrantClient({ 
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      checkCompatibility: false  // Bypass version compatibility check
    });
    this.ensureCollection();
    // CR-CS30: Ensure cs30 collection exists
    this.ensureCs30Collection();
    this.initializeAbbreviationIndex();
    
    // Default to assuming hybrid search is available in newer QDrant versions
    // This can be configured via env variable
    this.hybridSearchSupported = process.env.QDRANT_HYBRID_SEARCH === 'true';
    console.log(`Hybrid search support: ${this.hybridSearchSupported ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Embedding provider: ${EMBEDDING_PROVIDER.toUpperCase()} | Collection: ${QDRANT_COLLECTION_NAME}`);
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
          vectors: { size: COLLECTION_EMBED_DIM, distance: 'Cosine' },
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
      const queryVector = await providerEmbedding(query);
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

  // --- New: Guided semantic search per Qdrant Retrieval Guidelines ---
  private static filterPseudocode(): any {
    return {
      must: [
        {
          key: 'chunk_type',
          match: { any: [
            'pseudocode_flow',
            'pseudocode_validations_rules',
            'pseudocode_functions',
            'pseudocode_table_maps',
            'pseudocode_entities_segments',
            'pseudocode_header',
            'pseudocode_examples',
            'pseudocode_anchors'
          ] }
        }
      ]
    };
  }
  private static filterExcludeVisual(): any {
    return { must_not: [{ key: 'chunk_type', match: { value: 'visual_structure' } }] };
  }
  private static filterByPages(pages: number[]): any {
    return { must: [{ key: 'page_number', match: { any: pages } }] };
  }
  private static combineFilters(...filters: Array<any | null | undefined>): any | undefined {
    const f = filters.filter(Boolean) as any[];
    if (!f.length) return undefined;
    const must: any[] = [];
    const must_not: any[] = [];
    for (const x of f) {
      if (x.must) must.push(...x.must);
      if (x.must_not) must_not.push(...x.must_not);
    }
    return { ...(must.length ? { must } : {}), ...(must_not.length ? { must_not } : {}) };
  }
  private static mergeWeighted(resultsA: any[], resultsB: any[], alpha = 0.75) {
    const map = new Map<string | number, { point: any; score: number }>();
    for (const r of resultsA || []) map.set(r.id, { point: r, score: alpha * (r.score ?? 0) });
    for (const r of resultsB || []) {
      const prev = map.get(r.id);
      const s = (1 - alpha) * (r.score ?? 0);
      if (prev) prev.score += s; else map.set(r.id, { point: r, score: s });
    }
    return [...map.values()].map(x => ({ ...x.point, merged_score: x.score }))
      .sort((a, b) => (b.merged_score ?? 0) - (a.merged_score ?? 0));
  }
  private static payloadBoost(p: any): number {
    const t = (p?.payload?.chunk_type || '') as string;
    let b = 0;
    if (t.includes('pseudocode_validations_rules')) b += 0.06;
    else if (t.includes('pseudocode_flow')) b += 0.04;
    else if (t.includes('pseudocode_table_maps')) b += 0.03;
    const kw: string[] = (p?.payload?.keywords || []) as string[];
    if (kw.some(k => /AHB|MIG|EDIFACT|ORDCHG|PRICAT|APERAK|IFTSTA|ORDERS/i.test(k))) b += 0.02;
    return b;
  }
  private static async outlineScopePages(client: QdrantClient, queryVector: number[], topPages = 3): Promise<number[]> {
    try {
      const outlineRes: any[] = await client.search(QDRANT_COLLECTION_NAME, {
        vector: queryVector,
        limit: topPages,
        with_payload: true as any,
        with_vector: false as any,
        filter: { must: [{ key: 'chunk_type', match: { value: 'pseudocode_outline' } }] }
      } as any);
      const pages = Array.from(new Set((outlineRes || []).map(p => p.payload?.page_number).filter((x: any) => x != null)));
      return pages as number[];
    } catch (_) {
      return [];
    }
  }

  static async semanticSearchGuided(query: string, options?: { limit?: number; alpha?: number; outlineScoping?: boolean; excludeVisual?: boolean; }): Promise<any[]> {
    const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY, checkCompatibility: false });
    const limit = options?.limit ?? 20;
    const alpha = options?.alpha ?? 0.75;
    const excludeVisual = options?.excludeVisual ?? true;
    const useOutline = options?.outlineScoping ?? true;

    try {
      const v = await providerEmbedding(query);

      // Optional outline scoping to top pages
      let pageFilter: any | undefined;
      if (useOutline) {
        const pages = await this.outlineScopePages(client, v, 3);
        if (pages?.length) pageFilter = this.filterByPages(pages);
      }

      // S1: pseudocode-only
      const filterA = this.combineFilters(this.filterPseudocode(), pageFilter);
      const resA: any[] = await client.search(QDRANT_COLLECTION_NAME, {
        vector: v,
        limit: Math.max(30, limit),
        with_payload: true as any,
        with_vector: false as any,
        ...(filterA ? { filter: filterA } : {})
      } as any);

      // S2: broad, optionally exclude visual_structure
      const filterB = this.combineFilters(excludeVisual ? this.filterExcludeVisual() : undefined, pageFilter);
      const resB: any[] = await client.search(QDRANT_COLLECTION_NAME, {
        vector: v,
        limit: Math.max(30, limit),
        with_payload: true as any,
        with_vector: false as any,
        ...(filterB ? { filter: filterB } : {})
      } as any);

      // Merge with weighting and light boosting
      const merged = this.mergeWeighted(resA, resB, alpha).slice(0, limit * 2);
      for (const p of merged) p.merged_score = (p.merged_score ?? 0) + this.payloadBoost(p);
      merged.sort((a, b) => (b.merged_score ?? 0) - (a.merged_score ?? 0));
      return merged.slice(0, limit);
    } catch (error) {
      console.error('Error in semanticSearchGuided:', error);
      // Fallback to simple vector search
      try {
        const v = await providerEmbedding(query);
        const results = await client.search(QDRANT_COLLECTION_NAME, { vector: v, limit } as any);
        return results as any[];
      } catch (e) {
        console.error('Fallback vector search failed:', e);
        return [];
      }
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
          vectors: { size: COLLECTION_EMBED_DIM, distance: 'Cosine' },
        });
        console.log(`Collection ${QDRANT_COLLECTION_NAME} created.`);
      }
    } catch (error) {
      console.error('Error ensuring Qdrant collection:', error);
    }
  }

  // CR-CS30: Ensure cs30 collection exists
  private async ensureCs30Collection() {
    try {
      const result = await this.client.getCollections();
      const collectionExists = result.collections.some(
        (collection: any) => collection.name === CS30_COLLECTION_NAME
      );

      if (!collectionExists) {
        console.log(`⚠️  CS30 collection '${CS30_COLLECTION_NAME}' does not exist. Skipping creation as it should be managed externally.`);
      } else {
        console.log(`✅ CS30 collection '${CS30_COLLECTION_NAME}' is available.`);
      }
    } catch (error) {
      console.error('Error checking CS30 collection:', error);
    }
  }

  async upsertDocument(document: UserDocument, text: string) {
    const embedding = await providerEmbedding(text);

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
            is_user_document: true,
            message_format: 'Mein Workspace',
            content_type: 'user_document',
            access_control: document.is_public ? 'public' : document.access_control || 'private',
            access_control_users: document.shared_with_users || [],
            access_control_teams: document.team_id ? [document.team_id] : [],
            team_id: document.team_id || null,
            document_name: document.title,
            document_base_name: document.original_name || document.title
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
    const queryVector = await providerEmbedding(queryText);

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
      const queryVector = await providerEmbedding(query);
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
      const embedding = await providerEmbedding(text);
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

  /**
   * Initialisiert den In-Memory-Index für Abkürzungen
   */
  private async initializeAbbreviationIndex() {
    try {
      const abbreviationResults = await this.client.scroll(QDRANT_COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: 'chunk_type',
              match: { value: 'abbreviation' }
            }
          ]
        },
        limit: 1000,
        with_payload: true,
        with_vector: false
      });

      abbreviationResults.points.forEach((point: any) => {
        if (point.payload?.text) {
          // Extrahiere Abkürzung aus dem Text (vereinfacht)
          const match = point.payload.text.match(/([A-Z]{2,})\s*[:\-]\s*(.+)/);
          if (match) {
            this.abbreviationIndex.set(match[1], match[2]);
          }
        }
      });

      console.log(`Initialized abbreviation index with ${this.abbreviationIndex.size} entries`);
    } catch (error) {
      console.error('Error initializing abbreviation index:', error);
    }
  }

  /**
   * Analysiert die Nutzeranfrage und erstellt entsprechende Filter (DEPRECATED - use QueryAnalysisService)
   */
  private analyzeQueryForFilters(query: string): any | null {
    // Diese Methode ist deprecated und wird durch QueryAnalysisService ersetzt
    return null;
  }

  /**
   * Erweitert eine Anfrage mit gefundenen Abkürzungen (DEPRECATED - use QueryAnalysisService)
   */
  private expandQueryWithAbbreviations(query: string): string {
    // Fallback implementation
    let expandedQuery = query;

    for (const [abbreviation, fullTerm] of this.abbreviationIndex.entries()) {
      const regex = new RegExp(`\\b${abbreviation}\\b`, 'gi');
      if (regex.test(query)) {
        expandedQuery = expandedQuery.replace(regex, `${abbreviation} (${fullTerm})`);
      }
    }

    return expandedQuery;
  }

  /**
   * Ermittelt die aktuellsten Versionen aller Dokumente
   */
  private async getLatestDocumentVersions(): Promise<string[]> {
    try {
      // Aggregiere alle document_base_name Werte und finde die neuesten publication_date
      const aggregationResult = await this.client.scroll(QDRANT_COLLECTION_NAME, {
        limit: 10000, // Große Anzahl um alle Dokumente zu erfassen
        with_payload: true,
        with_vector: false
      });

      const documentVersions = new Map<string, { date: string; name: string }>();

      aggregationResult.points.forEach((point: any) => {
        const payload = point.payload;
        if (payload?.document_metadata?.document_base_name && payload?.document_metadata?.publication_date) {
          const baseName = payload.document_metadata.document_base_name;
          const pubDate = payload.document_metadata.publication_date;
          
          if (!documentVersions.has(baseName) || pubDate > documentVersions.get(baseName)!.date) {
            documentVersions.set(baseName, { date: pubDate, name: baseName });
          }
        }
      });

      return Array.from(documentVersions.values()).map(v => v.name);
    } catch (error) {
      console.error('Error getting latest document versions:', error);
      return [];
    }
  }

  /**
   * Optimierte Suchfunktion mit Pre-Filtering und Query-Transformation
   */
  async searchWithOptimizations(
    query: string, 
    limit: number = 10, 
    scoreThreshold: number = 0.5,
    useHyDE: boolean = true
  ) {
    try {
      // 1. Verwende QueryAnalysisService für intelligente Analyse
      const analysisResult = QueryAnalysisService.analyzeQuery(query, this.abbreviationIndex);
      
      // 2. HyDE: Generiere hypothetische Antwort
      let searchQuery = analysisResult.expandedQuery;
      if (useHyDE) {
        try {
          const hypotheticalAnswer = await providerHyde(analysisResult.expandedQuery);
          searchQuery = hypotheticalAnswer;
        } catch (error) {
          console.error('Error generating hypothetical answer, using expanded query:', error);
        }
      }

      // 3. Hole aktuelle Dokumentversionen für Filter
      const latestVersions = await this.getLatestDocumentVersions();

      // 4. Erstelle Filter basierend auf Analyse
      const filter = QueryAnalysisService.createQdrantFilter(analysisResult, latestVersions);

      // 5. Embedding generieren und suchen
      const queryVector = await providerEmbedding(searchQuery);
      
      const searchParams: any = {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
      };

      if (filter) {
        searchParams.filter = filter;
      }

      const results = await this.client.search(QDRANT_COLLECTION_NAME, searchParams);

      // 6. Erweitere Ergebnisse mit Metadaten und Kontext-Information
      return results.map((result: any) => {
        return {
          ...result,
          payload: {
            ...result.payload,
            search_metadata: {
              original_query: query,
              expanded_query: analysisResult.expandedQuery,
              search_query: searchQuery,
              analysis_result: {
                intent_type: analysisResult.intentType,
                confidence: analysisResult.confidence,
                document_reference: analysisResult.documentReference,
                filter_summary: QueryAnalysisService.createFilterSummary(analysisResult),
              },
              filter_applied: filter ? Object.keys(filter) : [],
              used_hyde: useHyDE,
              latest_versions_available: latestVersions.length,
            },
          },
        };
      });

    } catch (error) {
      console.error('Error in optimized search:', error);
      return [];
    }
  }

  // Method for storing FAQ content in vector database
  async storeFAQContent(
    faqId: string,
    title: string,
    description: string,
    context: string,
    answer: string,
    additionalInfo: string,
    tags: string[]
  ) {
    try {
      // Combine all FAQ content for embedding
      const fullContent = `${title}\n\n${description}\n\n${context}\n\n${answer}\n\n${additionalInfo}`.trim();
      
      const embedding = await providerEmbedding(fullContent);
      
      await this.client.upsert(QDRANT_COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: `faq_${faqId}`,
            vector: embedding,
            payload: {
              type: 'faq',
              faq_id: faqId,
              title,
              description,
              context,
              answer,
              additional_info: additionalInfo,
              tags,
              text: fullContent,
              created_at: new Date().toISOString(),
            },
          },
        ],
      });
      
      console.log(`FAQ ${faqId} stored in vector database`);
    } catch (error) {
      console.error('Error storing FAQ in vector database:', error);
      throw error;
    }
  }

  // Method for updating FAQ content in vector database
  async updateFAQContent(
    faqId: string,
    title: string,
    description: string,
    context: string,
    answer: string,
    additionalInfo: string,
    tags: string[]
  ) {
    try {
      // Update is the same as store for Qdrant
      await this.storeFAQContent(faqId, title, description, context, answer, additionalInfo, tags);
      console.log(`FAQ ${faqId} updated in vector database`);
    } catch (error) {
      console.error('Error updating FAQ in vector database:', error);
      throw error;
    }
  }

  // Method for deleting FAQ from vector database
  async deleteFAQContent(faqId: string) {
    try {
      await this.client.delete(QDRANT_COLLECTION_NAME, {
        points: [`faq_${faqId}`],
      });
      console.log(`FAQ ${faqId} deleted from vector database`);
    } catch (error) {
      console.error('Error deleting FAQ from vector database:', error);
      throw error;
    }
  }

  // Method for searching FAQs specifically
  async searchFAQs(query: string, limit: number = 10, scoreThreshold: number = 0.5) {
    try {
      const queryVector = await providerEmbedding(query);
      
      const results = await this.client.search(QDRANT_COLLECTION_NAME, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        filter: {
          must: [
            {
              key: 'type',
              match: {
                value: 'faq',
              },
            },
          ],
        },
      });
      
      return results;
    } catch (error) {
      console.error('Error searching FAQs:', error);
      return [];
    }
  }

  // CR-CS30: Search in cs30 collection for additional context
  async searchCs30(query: string, limit: number = 3, scoreThreshold: number = 0.80): Promise<any[]> {
    try {
      const queryVector = await providerEmbedding(query);
      const results = await this.client.search(CS30_COLLECTION_NAME, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
      });
      
      console.log(`🔍 CS30 search for "${query}": found ${results.length} results above threshold ${scoreThreshold}`);
      return results;
    } catch (error) {
      console.error('Error searching CS30 collection:', error);
      return [];
    }
  }

  // CR-CS30: Check if cs30 collection is available
  async isCs30Available(): Promise<boolean> {
    try {
      const result = await this.client.getCollections();
      return result.collections.some(
        (collection: any) => collection.name === CS30_COLLECTION_NAME
      );
    } catch (error) {
      console.error('Error checking CS30 availability:', error);
      return false;
    }
  }

  // Add hybrid search method
  async searchWithHybrid(
    query: string, 
    limit: number = 10, 
    scoreThreshold: number = 0.5,
    alpha: number = 0.5,  // Balances between vector and keyword search (0.0: only vector, 1.0: only keyword)
    userId?: string,     // Optional user ID to filter by access control
    teamId?: string      // Optional team ID for team-shared documents
  ) {
    try {
      console.log(`🔍 Performing hybrid search with alpha=${alpha}`);
      
      // Generate embedding for the query
      const queryVector = await providerEmbedding(query);
      
      // Set up search parameters for hybrid search
      const searchParams: any = {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
      };
      
      // Add hybrid search parameters if supported
      if (this.hybridSearchSupported) {
        // Add hybrid search parameters
        searchParams.query = query;  // Text query for keyword matching
        searchParams.alpha = alpha;  // Weight between vector and keyword search
      }
      
      // Add filter for user documents if userId is provided
      if (userId || teamId) {
        searchParams.filter = {
          should: [
            // Public documents accessible to everyone
            {
              must_not: [
                { key: "is_user_document", match: { value: true } }
              ]
            }
          ]
        };
        
        // Add user-specific filters if userId is provided
        if (userId) {
          // Add user's own documents
          searchParams.filter.should.push({
            must: [
              { key: "is_user_document", match: { value: true } },
              { key: "user_id", match: { value: userId } }
            ]
          });
          
          // Add documents shared with the user
          searchParams.filter.should.push({
            must: [
              { key: "is_user_document", match: { value: true } },
              { key: "access_control", match: { value: "public" } }
            ]
          });
          
          // Add documents where user is explicitly listed in access_control_users array
          if (userId) {
            searchParams.filter.should.push({
              must: [
                { key: "is_user_document", match: { value: true } },
                { key: "access_control_users", match: { value: userId } }
              ]
            });
          }
        }
        
        // Add team-specific filters if teamId is provided
        if (teamId) {
          searchParams.filter.should.push({
            must: [
              { key: "is_user_document", match: { value: true } },
              { key: "access_control_teams", match: { value: teamId } }
            ]
          });
        }
      }
      
      // Perform search
      const results = await this.client.search(QDRANT_COLLECTION_NAME, searchParams);
      
      // Add metadata to indicate hybrid search was used
      return {
        results,
        hybridSearchUsed: this.hybridSearchSupported,
        hybridSearchAlpha: alpha
      };
    } catch (error) {
      console.error('Error in hybrid search:', error);
      // Fall back to regular vector search
      console.log('Falling back to regular vector search');
      const queryVector = await providerEmbedding(query);
      const fallbackResults = await this.client.search(QDRANT_COLLECTION_NAME, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
      });
      
      return {
        results: fallbackResults,
        hybridSearchUsed: false
      };
    }
  }
}