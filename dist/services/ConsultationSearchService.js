"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationSearchService = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const embeddingProvider_1 = require("./embeddingProvider");
function collectionBaseFromSlug(slug) {
    // Align with ingestion: e.g., consultations-m53 for slug mitteilung-53
    const norm = slug.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    return `consultations-${norm.replace(/^mitteilung-/, 'm')}`; // map 'mitteilung-53' => 'm53' variant optional
}
class ConsultationSearchService {
    constructor() {
        this.client = new js_client_rest_1.QdrantClient({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY,
            checkCompatibility: false,
        });
    }
    async search(slug, query, topK = 5) {
        const base = collectionBaseFromSlug(slug);
        const collection = (0, embeddingProvider_1.getCollectionName)(base);
        // Verify collection exists
        try {
            const cols = await this.client.getCollections();
            if (!cols.collections.some((c) => c.name === collection))
                return [];
        }
        catch (_a) {
            return [];
        }
        const vec = await (0, embeddingProvider_1.generateEmbedding)(query.slice(0, 8000));
        const res = await this.client.search(collection, {
            vector: vec,
            limit: topK,
            with_payload: true,
            with_vector: false,
            score_threshold: 0.0,
        });
        const hits = (res || []).map((r) => {
            const p = r.payload || {};
            const text = p.text || '';
            const source = p.source || '';
            return { text, source, score: r.score || 0 };
        });
        return hits;
    }
}
exports.ConsultationSearchService = ConsultationSearchService;
//# sourceMappingURL=ConsultationSearchService.js.map