"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantService = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const queryAnalysisService_1 = require("./queryAnalysisService");
const embeddingProvider_1 = require("./embeddingProvider");
const embeddingProvider_2 = require("./embeddingProvider");
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
// Provider selection and derived config (centralized via embeddingProvider)
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'ewilli';
const QDRANT_COLLECTION_NAME = (0, embeddingProvider_2.getCollectionName)(BASE_COLLECTION);
const COLLECTION_EMBED_DIM = (0, embeddingProvider_2.getEmbeddingDimension)();
const EMBEDDING_PROVIDER = (0, embeddingProvider_2.getEmbeddingProvider)();
// CR-CS30: Add cs30 collection constant (unchanged)
const CS30_COLLECTION_NAME = process.env.CS30_COLLECTION || 'cs30';
class QdrantService {
    constructor() {
        this.abbreviationIndex = new Map();
        // Add flag for hybrid search capability
        this.hybridSearchSupported = false;
        this.client = new js_client_rest_1.QdrantClient({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
            checkCompatibility: false // Bypass version compatibility check
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
        const client = new js_client_rest_1.QdrantClient({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
            checkCompatibility: false // Bypass version compatibility check
        });
        try {
            const result = await client.getCollections();
            const collectionExists = result.collections.some((collection) => collection.name === QDRANT_COLLECTION_NAME);
            if (!collectionExists) {
                await client.createCollection(QDRANT_COLLECTION_NAME, {
                    vectors: { size: COLLECTION_EMBED_DIM, distance: 'Cosine' },
                });
                console.log(`Collection ${QDRANT_COLLECTION_NAME} created.`);
            }
        }
        catch (error) {
            console.error('Error creating Qdrant collection:', error);
        }
    }
    // Static method for searching by text (used in faq.ts)
    static async searchByText(query, limit = 10, scoreThreshold = 0.3) {
        const client = new js_client_rest_1.QdrantClient({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
            checkCompatibility: false // Bypass version compatibility check
        });
        try {
            const queryVector = await (0, embeddingProvider_1.generateEmbedding)(query);
            const results = await client.search(QDRANT_COLLECTION_NAME, {
                vector: queryVector,
                limit,
                score_threshold: scoreThreshold,
            });
            return results;
        }
        catch (error) {
            console.error('Error searching by text:', error);
            return [];
        }
    }
    // --- New: Guided semantic search per Qdrant Retrieval Guidelines ---
    static filterPseudocode() {
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
    static filterExcludeVisual() {
        return { must_not: [{ key: 'chunk_type', match: { value: 'visual_structure' } }] };
    }
    static filterByPages(pages) {
        return { must: [{ key: 'page_number', match: { any: pages } }] };
    }
    static combineFilters(...filters) {
        const f = filters.filter(Boolean);
        if (!f.length)
            return undefined;
        const must = [];
        const must_not = [];
        for (const x of f) {
            if (x.must)
                must.push(...x.must);
            if (x.must_not)
                must_not.push(...x.must_not);
        }
        return { ...(must.length ? { must } : {}), ...(must_not.length ? { must_not } : {}) };
    }
    static mergeWeighted(resultsA, resultsB, alpha = 0.75) {
        var _a, _b;
        const map = new Map();
        for (const r of resultsA || [])
            map.set(r.id, { point: r, score: alpha * ((_a = r.score) !== null && _a !== void 0 ? _a : 0) });
        for (const r of resultsB || []) {
            const prev = map.get(r.id);
            const s = (1 - alpha) * ((_b = r.score) !== null && _b !== void 0 ? _b : 0);
            if (prev)
                prev.score += s;
            else
                map.set(r.id, { point: r, score: s });
        }
        return [...map.values()].map(x => ({ ...x.point, merged_score: x.score }))
            .sort((a, b) => { var _a, _b; return ((_a = b.merged_score) !== null && _a !== void 0 ? _a : 0) - ((_b = a.merged_score) !== null && _b !== void 0 ? _b : 0); });
    }
    static payloadBoost(p) {
        var _a, _b;
        const t = (((_a = p === null || p === void 0 ? void 0 : p.payload) === null || _a === void 0 ? void 0 : _a.chunk_type) || '');
        let b = 0;
        if (t.includes('pseudocode_validations_rules'))
            b += 0.06;
        else if (t.includes('pseudocode_flow'))
            b += 0.04;
        else if (t.includes('pseudocode_table_maps'))
            b += 0.03;
        const kw = (((_b = p === null || p === void 0 ? void 0 : p.payload) === null || _b === void 0 ? void 0 : _b.keywords) || []);
        if (kw.some(k => /AHB|MIG|EDIFACT|ORDCHG|PRICAT|APERAK|IFTSTA|ORDERS/i.test(k)))
            b += 0.02;
        return b;
    }
    static async outlineScopePages(client, queryVector, topPages = 3) {
        try {
            const outlineRes = await client.search(QDRANT_COLLECTION_NAME, {
                vector: queryVector,
                limit: topPages,
                with_payload: true,
                with_vector: false,
                filter: { must: [{ key: 'chunk_type', match: { value: 'pseudocode_outline' } }] }
            });
            const pages = Array.from(new Set((outlineRes || []).map(p => { var _a; return (_a = p.payload) === null || _a === void 0 ? void 0 : _a.page_number; }).filter((x) => x != null)));
            return pages;
        }
        catch (_) {
            return [];
        }
    }
    static async semanticSearchGuided(query, options) {
        var _a, _b, _c, _d, _e;
        const client = new js_client_rest_1.QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY, checkCompatibility: false });
        const limit = (_a = options === null || options === void 0 ? void 0 : options.limit) !== null && _a !== void 0 ? _a : 20;
        const alpha = (_b = options === null || options === void 0 ? void 0 : options.alpha) !== null && _b !== void 0 ? _b : 0.75;
        const excludeVisual = (_c = options === null || options === void 0 ? void 0 : options.excludeVisual) !== null && _c !== void 0 ? _c : true;
        const useOutline = (_d = options === null || options === void 0 ? void 0 : options.outlineScoping) !== null && _d !== void 0 ? _d : true;
        try {
            const v = await (0, embeddingProvider_1.generateEmbedding)(query);
            // Optional outline scoping to top pages
            let pageFilter;
            if (useOutline) {
                const pages = await this.outlineScopePages(client, v, 3);
                if (pages === null || pages === void 0 ? void 0 : pages.length)
                    pageFilter = this.filterByPages(pages);
            }
            // S1: pseudocode-only
            const filterA = this.combineFilters(this.filterPseudocode(), pageFilter);
            const resA = await client.search(QDRANT_COLLECTION_NAME, {
                vector: v,
                limit: Math.max(30, limit),
                with_payload: true,
                with_vector: false,
                ...(filterA ? { filter: filterA } : {})
            });
            // S2: broad, optionally exclude visual_structure
            const filterB = this.combineFilters(excludeVisual ? this.filterExcludeVisual() : undefined, pageFilter);
            const resB = await client.search(QDRANT_COLLECTION_NAME, {
                vector: v,
                limit: Math.max(30, limit),
                with_payload: true,
                with_vector: false,
                ...(filterB ? { filter: filterB } : {})
            });
            // Merge with weighting and light boosting
            const merged = this.mergeWeighted(resA, resB, alpha).slice(0, limit * 2);
            for (const p of merged)
                p.merged_score = ((_e = p.merged_score) !== null && _e !== void 0 ? _e : 0) + this.payloadBoost(p);
            merged.sort((a, b) => { var _a, _b; return ((_a = b.merged_score) !== null && _a !== void 0 ? _a : 0) - ((_b = a.merged_score) !== null && _b !== void 0 ? _b : 0); });
            return merged.slice(0, limit);
        }
        catch (error) {
            console.error('Error in semanticSearchGuided:', error);
            // Fallback to simple vector search
            try {
                const v = await (0, embeddingProvider_1.generateEmbedding)(query);
                const results = await client.search(QDRANT_COLLECTION_NAME, { vector: v, limit });
                return results;
            }
            catch (e) {
                console.error('Fallback vector search failed:', e);
                return [];
            }
        }
    }
    async ensureCollection() {
        try {
            const result = await this.client.getCollections();
            const collectionExists = result.collections.some((collection) => collection.name === QDRANT_COLLECTION_NAME);
            if (!collectionExists) {
                await this.client.createCollection(QDRANT_COLLECTION_NAME, {
                    vectors: { size: COLLECTION_EMBED_DIM, distance: 'Cosine' },
                });
                console.log(`Collection ${QDRANT_COLLECTION_NAME} created.`);
            }
        }
        catch (error) {
            console.error('Error ensuring Qdrant collection:', error);
        }
    }
    // CR-CS30: Ensure cs30 collection exists
    async ensureCs30Collection() {
        try {
            const result = await this.client.getCollections();
            const collectionExists = result.collections.some((collection) => collection.name === CS30_COLLECTION_NAME);
            if (!collectionExists) {
                console.log(`⚠️  CS30 collection '${CS30_COLLECTION_NAME}' does not exist. Skipping creation as it should be managed externally.`);
            }
            else {
                console.log(`✅ CS30 collection '${CS30_COLLECTION_NAME}' is available.`);
            }
        }
        catch (error) {
            console.error('Error checking CS30 collection:', error);
        }
    }
    async upsertDocument(document, text) {
        const embedding = await (0, embeddingProvider_1.generateEmbedding)(text);
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
    async deleteDocument(documentId) {
        await this.client.delete(QDRANT_COLLECTION_NAME, {
            points: [documentId],
        });
    }
    async search(userId, queryText, limit = 10) {
        const queryVector = await (0, embeddingProvider_1.generateEmbedding)(queryText);
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
    async searchByText(query, limit = 10, scoreThreshold = 0.3) {
        try {
            const queryVector = await (0, embeddingProvider_1.generateEmbedding)(query);
            const results = await this.client.search(QDRANT_COLLECTION_NAME, {
                vector: queryVector,
                limit,
                score_threshold: scoreThreshold,
            });
            return results;
        }
        catch (error) {
            console.error('Error searching by text:', error);
            return [];
        }
    }
    // Method for storing user document chunks
    async storeUserDocumentChunk(vectorId, text, documentId, userId, title, chunkIndex) {
        try {
            const embedding = await (0, embeddingProvider_1.generateEmbedding)(text);
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
        }
        catch (error) {
            console.error('Error storing document chunk:', error);
            throw error;
        }
    }
    // Method for deleting a vector by ID
    async deleteVector(vectorId) {
        try {
            await this.client.delete(QDRANT_COLLECTION_NAME, {
                points: [vectorId],
            });
        }
        catch (error) {
            console.error('Error deleting vector:', error);
            throw error;
        }
    }
    /**
     * Initialisiert den In-Memory-Index für Abkürzungen
     */
    async initializeAbbreviationIndex() {
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
            abbreviationResults.points.forEach((point) => {
                var _a;
                if ((_a = point.payload) === null || _a === void 0 ? void 0 : _a.text) {
                    // Extrahiere Abkürzung aus dem Text (vereinfacht)
                    const match = point.payload.text.match(/([A-Z]{2,})\s*[:\-]\s*(.+)/);
                    if (match) {
                        this.abbreviationIndex.set(match[1], match[2]);
                    }
                }
            });
            console.log(`Initialized abbreviation index with ${this.abbreviationIndex.size} entries`);
        }
        catch (error) {
            console.error('Error initializing abbreviation index:', error);
        }
    }
    /**
     * Analysiert die Nutzeranfrage und erstellt entsprechende Filter (DEPRECATED - use QueryAnalysisService)
     */
    analyzeQueryForFilters(query) {
        // Diese Methode ist deprecated und wird durch QueryAnalysisService ersetzt
        return null;
    }
    /**
     * Erweitert eine Anfrage mit gefundenen Abkürzungen (DEPRECATED - use QueryAnalysisService)
     */
    expandQueryWithAbbreviations(query) {
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
    async getLatestDocumentVersions() {
        try {
            // Aggregiere alle document_base_name Werte und finde die neuesten publication_date
            const aggregationResult = await this.client.scroll(QDRANT_COLLECTION_NAME, {
                limit: 10000, // Große Anzahl um alle Dokumente zu erfassen
                with_payload: true,
                with_vector: false
            });
            const documentVersions = new Map();
            aggregationResult.points.forEach((point) => {
                var _a, _b;
                const payload = point.payload;
                if (((_a = payload === null || payload === void 0 ? void 0 : payload.document_metadata) === null || _a === void 0 ? void 0 : _a.document_base_name) && ((_b = payload === null || payload === void 0 ? void 0 : payload.document_metadata) === null || _b === void 0 ? void 0 : _b.publication_date)) {
                    const baseName = payload.document_metadata.document_base_name;
                    const pubDate = payload.document_metadata.publication_date;
                    if (!documentVersions.has(baseName) || pubDate > documentVersions.get(baseName).date) {
                        documentVersions.set(baseName, { date: pubDate, name: baseName });
                    }
                }
            });
            return Array.from(documentVersions.values()).map(v => v.name);
        }
        catch (error) {
            console.error('Error getting latest document versions:', error);
            return [];
        }
    }
    /**
     * Optimierte Suchfunktion mit Pre-Filtering und Query-Transformation
     */
    async searchWithOptimizations(query, limit = 10, scoreThreshold = 0.3, useHyDE = true) {
        try {
            // 1. Verwende QueryAnalysisService für intelligente Analyse
            const analysisResult = queryAnalysisService_1.QueryAnalysisService.analyzeQuery(query, this.abbreviationIndex);
            // 2. HyDE: Generiere hypothetische Antwort
            let searchQuery = analysisResult.expandedQuery;
            if (useHyDE) {
                try {
                    const hypotheticalAnswer = await (0, embeddingProvider_1.generateHypotheticalAnswer)(analysisResult.expandedQuery);
                    searchQuery = hypotheticalAnswer;
                }
                catch (error) {
                    console.error('Error generating hypothetical answer, using expanded query:', error);
                }
            }
            // 3. Hole aktuelle Dokumentversionen für Filter
            const latestVersions = await this.getLatestDocumentVersions();
            // 4. Erstelle Filter basierend auf Analyse
            const filter = queryAnalysisService_1.QueryAnalysisService.createQdrantFilter(analysisResult, latestVersions);
            // 5. Embedding generieren und suchen
            const queryVector = await (0, embeddingProvider_1.generateEmbedding)(searchQuery);
            const searchParams = {
                vector: queryVector,
                limit,
                score_threshold: scoreThreshold,
            };
            if (filter) {
                searchParams.filter = filter;
            }
            const results = await this.client.search(QDRANT_COLLECTION_NAME, searchParams);
            // 6. Erweitere Ergebnisse mit Metadaten und Kontext-Information
            return results.map((result) => {
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
                                filter_summary: queryAnalysisService_1.QueryAnalysisService.createFilterSummary(analysisResult),
                            },
                            filter_applied: filter ? Object.keys(filter) : [],
                            used_hyde: useHyDE,
                            latest_versions_available: latestVersions.length,
                        },
                    },
                };
            });
        }
        catch (error) {
            console.error('Error in optimized search:', error);
            return [];
        }
    }
    // Method for storing FAQ content in vector database
    async storeFAQContent(faqId, title, description, context, answer, additionalInfo, tags) {
        try {
            // Combine all FAQ content for embedding
            const fullContent = `${title}\n\n${description}\n\n${context}\n\n${answer}\n\n${additionalInfo}`.trim();
            const embedding = await (0, embeddingProvider_1.generateEmbedding)(fullContent);
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
        }
        catch (error) {
            console.error('Error storing FAQ in vector database:', error);
            throw error;
        }
    }
    // Method for updating FAQ content in vector database
    async updateFAQContent(faqId, title, description, context, answer, additionalInfo, tags) {
        try {
            // Update is the same as store for Qdrant
            await this.storeFAQContent(faqId, title, description, context, answer, additionalInfo, tags);
            console.log(`FAQ ${faqId} updated in vector database`);
        }
        catch (error) {
            console.error('Error updating FAQ in vector database:', error);
            throw error;
        }
    }
    // Method for deleting FAQ from vector database
    async deleteFAQContent(faqId) {
        try {
            await this.client.delete(QDRANT_COLLECTION_NAME, {
                points: [`faq_${faqId}`],
            });
            console.log(`FAQ ${faqId} deleted from vector database`);
        }
        catch (error) {
            console.error('Error deleting FAQ from vector database:', error);
            throw error;
        }
    }
    // Method for searching FAQs specifically
    async searchFAQs(query, limit = 10, scoreThreshold = 0.3) {
        try {
            const queryVector = await (0, embeddingProvider_1.generateEmbedding)(query);
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
        }
        catch (error) {
            console.error('Error searching FAQs:', error);
            return [];
        }
    }
    // CR-CS30: Search in cs30 collection for additional context
    async searchCs30(query, limit = 3, scoreThreshold = 0.80) {
        try {
            const queryVector = await (0, embeddingProvider_1.generateEmbedding)(query);
            const results = await this.client.search(CS30_COLLECTION_NAME, {
                vector: queryVector,
                limit,
                score_threshold: scoreThreshold,
            });
            console.log(`🔍 CS30 search for "${query}": found ${results.length} results above threshold ${scoreThreshold}`);
            return results;
        }
        catch (error) {
            console.error('Error searching CS30 collection:', error);
            return [];
        }
    }
    // CR-CS30: Check if cs30 collection is available
    async isCs30Available() {
        try {
            const result = await this.client.getCollections();
            return result.collections.some((collection) => collection.name === CS30_COLLECTION_NAME);
        }
        catch (error) {
            console.error('Error checking CS30 availability:', error);
            return false;
        }
    }
    // Add hybrid search method
    async searchWithHybrid(query, limit = 10, scoreThreshold = 0.5, alpha = 0.5, // Balances between vector and keyword search (0.0: only vector, 1.0: only keyword)
    userId, // Optional user ID to filter by access control
    teamId // Optional team ID for team-shared documents
    ) {
        try {
            console.log(`🔍 Performing hybrid search with alpha=${alpha}`);
            // Generate embedding for the query
            const queryVector = await (0, embeddingProvider_1.generateEmbedding)(query);
            // Set up search parameters for hybrid search
            const searchParams = {
                vector: queryVector,
                limit,
                score_threshold: scoreThreshold,
            };
            // Add hybrid search parameters if supported
            if (this.hybridSearchSupported) {
                // Add hybrid search parameters
                searchParams.query = query; // Text query for keyword matching
                searchParams.alpha = alpha; // Weight between vector and keyword search
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
        }
        catch (error) {
            console.error('Error in hybrid search:', error);
            // Fall back to regular vector search
            console.log('Falling back to regular vector search');
            const queryVector = await (0, embeddingProvider_1.generateEmbedding)(query);
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
exports.QdrantService = QdrantService;
//# sourceMappingURL=qdrant.js.map