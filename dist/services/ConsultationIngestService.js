"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationIngestService = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const embeddingProvider_1 = require("./embeddingProvider");
const embeddingProvider_2 = require("./embeddingProvider");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class ConsultationIngestService {
    constructor(collectionBase = 'consultations') {
        this.client = new js_client_rest_1.QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333', apiKey: process.env.QDRANT_API_KEY, checkCompatibility: false });
        this.collection = (0, embeddingProvider_1.getCollectionName)(collectionBase);
        this.dim = (0, embeddingProvider_1.getEmbeddingDimension)();
    }
    async ensureCollection() {
        const cols = await this.client.getCollections();
        const exists = cols.collections.some((c) => c.name === this.collection);
        if (!exists) {
            await this.client.createCollection(this.collection, { vectors: { size: this.dim, distance: 'Cosine' } });
        }
    }
    async ingestText(items) {
        await this.ensureCollection();
        const points = [];
        for (const [idx, it] of items.entries()) {
            const vec = await (0, embeddingProvider_2.generateEmbedding)(it.text);
            // Qdrant requires ID to be unsigned integer or UUID. Use UUID always; keep original in payload.
            const originalId = it.id;
            const id = (0, uuid_1.v4)();
            points.push({ id, vector: vec, payload: { text: it.text, source: it.source, original_id: originalId, ...it.meta } });
        }
        if (points.length)
            await this.client.upsert(this.collection, { points });
    }
    async ingestPdf(filePath, source, opts) {
        var _a;
        const buf = fs_1.default.readFileSync(filePath);
        const parsed = await (0, pdf_parse_1.default)(buf);
        const text = parsed.text || '';
        const chunks = this.chunk(text, (_a = opts === null || opts === void 0 ? void 0 : opts.maxChunk) !== null && _a !== void 0 ? _a : 1200);
        const items = chunks.map((t, i) => ({ id: `${pathBasename(filePath)}_${i}`, text: t, source, meta: { file: filePath, type: 'pdf' } }));
        await this.ingestText(items);
    }
    async ingestUrls(urls, fetcher) {
        const items = [];
        for (const u of urls) {
            const txt = await fetcher(u);
            if (!txt)
                continue;
            const chunks = this.chunk(txt, 1200);
            chunks.forEach((t, i) => items.push({ id: `${hash(u)}_${i}`, text: t, source: u, meta: { type: 'html' } }));
        }
        await this.ingestText(items);
    }
    chunk(s, size) {
        const out = [];
        let cur = s.trim();
        while (cur.length > size) {
            let cut = cur.lastIndexOf('\n', size);
            if (cut < size * 0.5)
                cut = size;
            out.push(cur.slice(0, cut).trim());
            cur = cur.slice(cut).trim();
        }
        if (cur)
            out.push(cur);
        return out;
    }
}
exports.ConsultationIngestService = ConsultationIngestService;
function pathBasename(p) {
    return p.replace(/\\/g, '/').split('/').pop() || 'file';
}
function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
}
//# sourceMappingURL=ConsultationIngestService.js.map