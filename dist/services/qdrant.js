"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantService = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const gemini_1 = __importDefault(require("./gemini"));
const queryAnalysisService_1 = require("./queryAnalysisService");
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'ewilli';
class QdrantService {
    constructor() {
        this.abbreviationIndex = new Map();
        this.client = new js_client_rest_1.QdrantClient({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
            checkCompatibility: false // Bypass version compatibility check
        });
        this.ensureCollection();
        this.initializeAbbreviationIndex();
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
                    vectors: { size: 768, distance: 'Cosine' }, // Assuming embedding size of 768
                });
                console.log(`Collection ${QDRANT_COLLECTION_NAME} created.`);
            }
        }
        catch (error) {
            console.error('Error creating Qdrant collection:', error);
        }
    }
    // Static method for searching by text (used in faq.ts)
    static async searchByText(query, limit = 10, scoreThreshold = 0.5) {
        const client = new js_client_rest_1.QdrantClient({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
            checkCompatibility: false // Bypass version compatibility check
        });
        try {
            const queryVector = await gemini_1.default.generateEmbedding(query);
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
    async ensureCollection() {
        try {
            const result = await this.client.getCollections();
            const collectionExists = result.collections.some((collection) => collection.name === QDRANT_COLLECTION_NAME);
            if (!collectionExists) {
                await this.client.createCollection(QDRANT_COLLECTION_NAME, {
                    vectors: { size: 768, distance: 'Cosine' }, // Assuming embedding size of 768
                });
                console.log(`Collection ${QDRANT_COLLECTION_NAME} created.`);
            }
        }
        catch (error) {
            console.error('Error ensuring Qdrant collection:', error);
        }
    }
    async upsertDocument(document, text) {
        const embedding = await gemini_1.default.generateEmbedding(text);
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
    async deleteDocument(documentId) {
        await this.client.delete(QDRANT_COLLECTION_NAME, {
            points: [documentId],
        });
    }
    async search(userId, queryText, limit = 10) {
        const queryVector = await gemini_1.default.generateEmbedding(queryText);
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
    async searchByText(query, limit = 10, scoreThreshold = 0.5) {
        try {
            const queryVector = await gemini_1.default.generateEmbedding(query);
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
            const embedding = await gemini_1.default.generateEmbedding(text);
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
    async searchWithOptimizations(query, limit = 10, scoreThreshold = 0.5, useHyDE = true) {
        try {
            // 1. Verwende QueryAnalysisService für intelligente Analyse
            const analysisResult = queryAnalysisService_1.QueryAnalysisService.analyzeQuery(query, this.abbreviationIndex);
            // 2. HyDE: Generiere hypothetische Antwort
            let searchQuery = analysisResult.expandedQuery;
            if (useHyDE) {
                try {
                    const hypotheticalAnswer = await gemini_1.default.generateHypotheticalAnswer(analysisResult.expandedQuery);
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
            const queryVector = await gemini_1.default.generateEmbedding(searchQuery);
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
            const embedding = await gemini_1.default.generateEmbedding(fullContent);
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
    async searchFAQs(query, limit = 10, scoreThreshold = 0.5) {
        try {
            const queryVector = await gemini_1.default.generateEmbedding(query);
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
}
exports.QdrantService = QdrantService;
//# sourceMappingURL=qdrant.js.map