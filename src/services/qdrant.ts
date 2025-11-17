import { QdrantClient } from '@qdrant/js-client-rest';
import { UserDocument } from '../types/workspace';
import { QueryAnalysisService, QueryAnalysisResult } from './queryAnalysisService';
import { generateEmbedding as providerEmbedding, generateHypotheticalAnswer as providerHyde } from './embeddingProvider';
import { getCollectionName, getEmbeddingDimension, getEmbeddingProvider } from './embeddingProvider';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Provider selection and derived config (centralized via embeddingProvider)
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'willi_mako';
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

  // --- Simple in-memory embedding cache (LRU-light) ---
  private static embeddingCache: Map<string, number[]> = new Map();
  private static maxCacheEntries = parseInt(process.env.EMBED_CACHE_SIZE || '500', 10);
  private static getEmbeddingCached = async (text: string): Promise<number[]> => {
    const key = text.trim();
    const existing = this.embeddingCache.get(key);
    if (existing) return existing;
    const vec = await providerEmbedding(key);
    // Evict oldest if size exceeded
    if (this.embeddingCache.size >= this.maxCacheEntries) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(key, vec);
    return vec;
  };

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
  static async searchByText(query: string, limit: number = 10, scoreThreshold: number = 0.3) {
    const client = new QdrantClient({ 
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      checkCompatibility: false  // Bypass version compatibility check
    });
    try {
  const queryVector = await this.getEmbeddingCached(query);
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
            'pseudocode_raw',
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
    // Reduced pseudocode boosts (were dominating domain full text)
    if (t.includes('pseudocode_validations_rules')) b += 0.02;
    else if (t.includes('pseudocode_flow')) b += 0.015;
    else if (t.includes('pseudocode_table_maps')) b += 0.01;

  const kw: string[] = (p?.payload?.keywords || []) as string[];
  if (kw.some(k => /AHB|MIG|EDIFACT|ORDCHG|PRICAT|APERAK|IFTSTA|ORDERS|INVOIC|REMADV|GPKE/i.test(k))) b += 0.02;

    // Domain full/paragraph emphasis: detect EDIFACT segment & data element patterns
    const text: string = (p?.payload?.contextual_content || p?.payload?.text || p?.payload?.content || '') as string;
  const upper = text.toUpperCase();
    if (/(PRI\+CAL|UNB\+|UNH\+|BGM\+|DTM\+)/i.test(text) && (t === 'full_page' || t === 'paragraph' || t === 'n/a')) {
      b += 0.05; // segment signal
    }
    // Data element 4-digit codes
  const dataElems: string[] = upper.match(/\b\d{4}\b/g) || [];
  if (dataElems.includes('6411')) b += 0.04; // explicit boost for questioned element
    // Mild boost for presence of any process numbers (31xxx) - fosters cardinality context
    if (/31\d{3}/.test(upper)) b += 0.02;
    
  // Boost admin-provided markdown content slightly to help intent grounding (e.g., glossary)
  const ctype = (p?.payload?.content_type || '') as string;
  if (ctype === 'admin_markdown') b += 0.03;
  else if (ctype === 'correction_feedback') b += 0.03;
  if (t === 'abbreviation') b += 0.04;
  // Domain boost: Ersatz-/Grundversorgung/EoG-Kontext priorisieren
  if (/\bERSATZVERSORGUNG\b/.test(upper) || /\bGRUNDVERSORGUNG\b/.test(upper) || /\bEOG\b/.test(upper)) {
      b += 0.04;
    }
    return b;
  }
  private static async outlineScopePages(client: QdrantClient, queryVector: number[], topPages = 3, collectionName: string = QDRANT_COLLECTION_NAME): Promise<number[]> {
    try {
      const outlineRes: any[] = await client.search(collectionName, {
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
    return this.semanticSearchGuidedByCollection(query, options, QDRANT_COLLECTION_NAME);
  }

  /**
   * Combined semantic search across both willi_mako and willi-netz collections
   * Queries both collections in parallel and merges results by score
   * @param query - Search query
   * @param options - Search options (limit, alpha, outlineScoping, excludeVisual)
   * @returns Merged and sorted results with sourceCollection marker
   */
  static async semanticSearchCombined(
    query: string,
    options?: { limit?: number; alpha?: number; outlineScoping?: boolean; excludeVisual?: boolean; }
  ): Promise<any[]> {
    const limit = options?.limit ?? 20;
    
    try {
      // Query both collections in parallel for performance
      const [resultsWilliMako, resultsWilliNetz] = await Promise.all([
        this.semanticSearchGuidedByCollection(query, options, 'willi_mako'),
        this.semanticSearchGuidedByCollection(query, options, 'willi-netz')
      ]);

      // Mark source collection for each result
      const markedWilliMako = resultsWilliMako.map(r => ({
        ...r,
        sourceCollection: 'willi_mako',
        payload: { ...r.payload, sourceCollection: 'willi_mako' }
      }));

      const markedWilliNetz = resultsWilliNetz.map(r => ({
        ...r,
        sourceCollection: 'willi-netz',
        payload: { ...r.payload, sourceCollection: 'willi-netz' }
      }));

      // Combine and sort by score (merged_score takes precedence)
      const combined = [...markedWilliMako, ...markedWilliNetz];
      combined.sort((a, b) => {
        const scoreA = a.merged_score ?? a.score ?? 0;
        const scoreB = b.merged_score ?? b.score ?? 0;
        return scoreB - scoreA;
      });

      // Return top results up to limit
      return combined.slice(0, limit);
    } catch (error) {
      console.error('Error in semanticSearchCombined:', error);
      // Fallback to willi_mako only
      return this.semanticSearchGuidedByCollection(query, options, QDRANT_COLLECTION_NAME);
    }
  }

  static async semanticSearchGuidedByCollection(
    query: string, 
    options?: { limit?: number; alpha?: number; outlineScoping?: boolean; excludeVisual?: boolean; },
    collectionName: string = QDRANT_COLLECTION_NAME
  ): Promise<any[]> {
    const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY, checkCompatibility: false });
    const limit = options?.limit ?? 20;
    const alpha = options?.alpha ?? 0.75;
    const excludeVisual = options?.excludeVisual ?? true;
    const useOutline = options?.outlineScoping ?? true;
    const cardinalityIntent = /(\bM\[\d+\]|\bX\[\d+\])/.test(query) && /\b\d{4}\b/.test(query);

    try {
  const v = await this.getEmbeddingCached(query);

      // Optional outline scoping to top pages
      let pageFilter: any | undefined;
      if (useOutline) {
        const pages = await this.outlineScopePages(client, v, 3, collectionName);
        if (pages?.length) pageFilter = this.filterByPages(pages);
      }

      // Phase 1: pseudocode-focused
      const filterA = this.combineFilters(this.filterPseudocode(), pageFilter);
      const resA: any[] = await client.search(collectionName, {
        vector: v,
        limit: Math.max(25, limit),
        with_payload: true as any,
        with_vector: false as any,
        ...(filterA ? { filter: filterA } : {})
      } as any);

      // Phase 2: broad (exclude visual if requested)
      const filterB = this.combineFilters(excludeVisual ? this.filterExcludeVisual() : undefined, pageFilter);
      const resB: any[] = await client.search(collectionName, {
        vector: v,
        limit: Math.max(25, limit),
        with_payload: true as any,
        with_vector: false as any,
        ...(filterB ? { filter: filterB } : {})
      } as any);

      // Phase 3: plain full vector (no filters) to capture domain full_page / paragraph that were being missed
      const resC: any[] = await client.search(collectionName, {
        vector: v,
        limit: Math.max(40, limit * 2),
        with_payload: true as any,
        with_vector: false as any
      } as any);

      // Optional Phase 4 (cardinality intent): slight additional plain search with increased limit for nuanced cardinality docs
      let resD: any[] = [];
      if (cardinalityIntent) {
        resD = await client.search(collectionName, {
          vector: v,
            limit: Math.max(50, limit * 2 + 10),
            with_payload: true as any,
            with_vector: false as any
        } as any);
      }

      // Merge A & B first (original weighting)
      const mergedAB = this.mergeWeighted(resA, resB, alpha);
      // Integrate C (plain) giving vector-only results extra chance (gamma weight)
      const gamma = 0.85;
      const map = new Map<string | number, any>();
      for (const m of mergedAB) map.set(m.id, m);
      for (const r of resC) {
        const existing = map.get(r.id);
        if (existing) {
          existing.merged_score = (existing.merged_score ?? existing.score ?? 0) + gamma * (r.score ?? 0);
        } else {
          map.set(r.id, { ...r, merged_score: gamma * (r.score ?? 0) });
        }
      }
      // Integrate D (cardinality boost) with higher gamma if intent
      if (resD.length) {
        const delta = 0.95;
        for (const r of resD) {
          const existing = map.get(r.id);
          if (existing) {
            existing.merged_score = (existing.merged_score ?? existing.score ?? 0) + delta * (r.score ?? 0);
          } else {
            map.set(r.id, { ...r, merged_score: delta * (r.score ?? 0) });
          }
        }
      }

      let merged = [...map.values()];
      // Apply payload/domain boosts
      for (const p of merged) {
        p.merged_score = (p.merged_score ?? p.score ?? 0) + this.payloadBoost(p);
        // Extra cardinality signal boost if intent and element appears
        if (cardinalityIntent) {
          const txt = (p.payload?.contextual_content || p.payload?.text || p.payload?.content || '').toUpperCase();
          if (/6411/.test(txt) && /PRI\+CAL/.test(txt)) p.merged_score += 0.05;
        }
      }
      // Sort & return top limit * 2 (to allow downstream re-ranking) but slice to limit at end
      merged.sort((a, b) => (b.merged_score ?? 0) - (a.merged_score ?? 0));
      return merged.slice(0, limit);
    } catch (error) {
      console.error('Error in semanticSearchGuidedByCollection:', error);
      // Fallback to simple vector search
      try {
  const v = await this.getEmbeddingCached(query);
        const results = await client.search(collectionName, { vector: v, limit } as any);
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
  const embedding = await QdrantService.getEmbeddingCached(text);

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
  const queryVector = await QdrantService.getEmbeddingCached(queryText);

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
  async searchByText(query: string, limit: number = 10, scoreThreshold: number = 0.3) {
    try {
  const queryVector = await QdrantService.getEmbeddingCached(query);
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
  const embedding = await QdrantService.getEmbeddingCached(text);
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
          // Extrahiere Abkürzung aus dem Text (robuster: erlaubt gemischte Groß-/Kleinschreibung wie "EoG")
          const match = point.payload.text.match(/([A-Za-zÄÖÜäöüß]{2,})\s*[:\-]\s*(.+)/);
          if (match) {
            // Schlüssel genau wie im Text speichern (Case bewahren), Lookup später case-insensitiv
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
  scoreThreshold: number = 0.3,
    useHyDE: boolean = true
  ) {
    try {
  // Environment override to disable HyDE globally (e.g. to mitigate quota / rate limits)
  const disableHydeEnv = (process.env.DISABLE_HYDE || '').toLowerCase();
  const hydeGloballyDisabled = disableHydeEnv === '1' || disableHydeEnv === 'true' || disableHydeEnv === 'yes';
  const hydeEnabled = useHyDE && !hydeGloballyDisabled;
      // 1. Verwende QueryAnalysisService für intelligente Analyse
      const analysisResult = QueryAnalysisService.analyzeQuery(query, this.abbreviationIndex);
      
      // 2. HyDE: Generiere hypothetische Antwort
      let searchQuery = analysisResult.expandedQuery;
  if (hydeEnabled) {
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
  const queryVector = await QdrantService.getEmbeddingCached(searchQuery);
      
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
                used_hyde: hydeEnabled,
                hyde_param_requested: useHyDE,
                hyde_disabled_env: hydeGloballyDisabled,
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
      
  const embedding = await QdrantService.getEmbeddingCached(fullContent);
      
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
  async searchFAQs(query: string, limit: number = 10, scoreThreshold: number = 0.3) {
    try {
  const queryVector = await QdrantService.getEmbeddingCached(query);
      
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
  const queryVector = await QdrantService.getEmbeddingCached(query);
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
  const queryVector = await QdrantService.getEmbeddingCached(query);
      
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
  const queryVector = await QdrantService.getEmbeddingCached(query);
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