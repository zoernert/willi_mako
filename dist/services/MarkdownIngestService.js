"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownIngestService = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const uuid_1 = require("uuid");
const embeddingProvider_1 = require("./embeddingProvider");
const embeddingProvider_2 = require("./embeddingProvider");
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'willi_mako';
const COLLECTION_NAME = (0, embeddingProvider_2.getCollectionName)(BASE_COLLECTION);
class MarkdownIngestService {
    constructor() {
        this.client = new js_client_rest_1.QdrantClient({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
            checkCompatibility: false
        });
    }
    /**
     * Upserts markdown content into Qdrant by chunking it and creating vectors.
     * Returns number of chunks and ids used.
     */
    async upsertMarkdown(req) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const slug = (req.slug || this.slugify(req.title)).slice(0, 120);
        const type = (req.type || 'guide');
        const tags = req.tags || [];
        // Extract abbreviation lines first so they become searchable and power the in-memory index
        const abbreviationEntries = this.extractAbbreviations(req.content);
        // Chunk markdown into manageable pieces (by headings and paragraph blocks)
        const chunks = this.chunkMarkdown(req.content);
        const points = [];
        let index = 0;
        // Preflight: generate a single embedding to detect vector length and validate collection config
        let vectorLength = null;
        try {
            const sampleText = (((_a = abbreviationEntries[0]) === null || _a === void 0 ? void 0 : _a.value) || ((_b = this.chunkMarkdown(req.content)[0]) === null || _b === void 0 ? void 0 : _b.text) || req.content || '').slice(0, 1000);
            if (sampleText) {
                const v = await (0, embeddingProvider_1.generateEmbedding)(sampleText);
                vectorLength = Array.isArray(v) ? v.length : null;
                // Check collection config
                if (vectorLength) {
                    const info = await this.client.getCollection(COLLECTION_NAME).catch(() => null);
                    const configuredSize = (_g = (_f = (_e = (_d = (_c = info === null || info === void 0 ? void 0 : info.result) === null || _c === void 0 ? void 0 : _c.config) === null || _d === void 0 ? void 0 : _d.params) === null || _e === void 0 ? void 0 : _e.vectors) === null || _f === void 0 ? void 0 : _f.size) !== null && _g !== void 0 ? _g : (_m = (_l = (_k = (_j = (_h = info === null || info === void 0 ? void 0 : info.result) === null || _h === void 0 ? void 0 : _h.config) === null || _j === void 0 ? void 0 : _j.params) === null || _k === void 0 ? void 0 : _k.vectors_config) === null || _l === void 0 ? void 0 : _l.params) === null || _m === void 0 ? void 0 : _m.size;
                    if (configuredSize && configuredSize !== vectorLength) {
                        throw new Error(`Qdrant collection '${COLLECTION_NAME}' vector size (${configuredSize}) mismatches embedding size (${vectorLength}). Ensure EMBEDDING_PROVIDER and collection are aligned (recreate collection or use correct provider).`);
                    }
                }
            }
        }
        catch (preErr) {
            console.error('Markdown ingest preflight failed:', preErr);
            throw preErr;
        }
        // 1) Abbreviations as dedicated points (chunk_type = 'abbreviation')
        for (const abbr of abbreviationEntries) {
            const text = `${abbr.key}: ${abbr.value}`;
            const vector = await (0, embeddingProvider_1.generateEmbedding)(text);
            // Use deterministic UUIDv5 for stable IDs per Qdrant requirements
            const id = (0, uuid_1.v5)(`md:${slug}:abbr:${abbr.key}`, uuid_1.v5.URL);
            points.push({
                id,
                vector,
                payload: {
                    content_type: 'admin_markdown',
                    md_type: 'abbreviation',
                    chunk_type: 'abbreviation',
                    slug,
                    title: req.title,
                    tags,
                    text,
                    abbreviation_key: abbr.key,
                    abbreviation_value: abbr.value,
                    created_by_user_id: req.createdByUserId || null,
                    created_at: new Date().toISOString()
                }
            });
        }
        // 2) Main content chunks
        for (const c of chunks) {
            const text = c.text.trim();
            if (!text)
                continue;
            // Avoid duplicating abbreviation-only short lines
            if (text.length < 12 && /[:\-]/.test(text) && /[A-Za-z]{2,8}/.test(text))
                continue;
            const vector = await (0, embeddingProvider_1.generateEmbedding)(text);
            const id = (0, uuid_1.v5)(`md:${slug}:chunk:${index}`, uuid_1.v5.URL);
            index++;
            points.push({
                id,
                vector,
                payload: {
                    content_type: 'admin_markdown',
                    md_type: type,
                    chunk_type: c.kind,
                    slug,
                    title: req.title,
                    heading: c.heading || null,
                    chunk_index: index - 1,
                    text,
                    tags,
                    created_by_user_id: req.createdByUserId || null,
                    created_at: new Date().toISOString()
                }
            });
        }
        if (!points.length)
            return { chunks: 0, ids: [], slug };
        try {
            await this.client.upsert(COLLECTION_NAME, {
                wait: true,
                points
            });
        }
        catch (err) {
            // Surface Qdrant error details for easier diagnosis (e.g., vector size mismatch)
            let detail = undefined;
            try {
                // Common shapes: err.response.data, err.data, err.message
                detail = ((_o = err === null || err === void 0 ? void 0 : err.response) === null || _o === void 0 ? void 0 : _o.data) || (err === null || err === void 0 ? void 0 : err.data) || (err === null || err === void 0 ? void 0 : err.message) || err;
            }
            catch (_p) { }
            const hint = vectorLength
                ? ` | embeddingSize=${vectorLength} collection='${COLLECTION_NAME}'`
                : '';
            throw new Error(`Qdrant upsert failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}${hint}`);
        }
        return { chunks: points.length, ids: points.map(p => p.id), slug };
    }
    /** Delete all vectors for a given markdown slug */
    async deleteBySlug(slug) {
        await this.client.delete(COLLECTION_NAME, {
            filter: { must: [{ key: 'slug', match: { value: slug } }, { key: 'content_type', match: { value: 'admin_markdown' } }] }
        });
        return { deleted: true };
    }
    /** Search only within admin_markdown content */
    async search(query, limit = 10) {
        const vector = await (0, embeddingProvider_1.generateEmbedding)(query);
        const results = await this.client.search(COLLECTION_NAME, {
            vector,
            limit,
            with_payload: true,
            with_vector: false,
            filter: { must: [{ key: 'content_type', match: { value: 'admin_markdown' } }] }
        });
        return results;
    }
    slugify(s) {
        return (s || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    }
    extractAbbreviations(md) {
        const entries = [];
        const lines = (md || '').split(/\r?\n/);
        for (const line of lines) {
            // Patterns: "EoG - Ersatz- oder Grundversorgung" or "EoG: Ersatz- oder Grundversorgung"
            const m = line.match(/^\s*([A-Za-zÄÖÜäöü]{2,10})\s*[:\-]\s+(.{3,})$/);
            if (m) {
                const key = m[1].trim();
                const value = m[2].trim();
                // prefer uppercase-ish abbreviations or camel
                if (/[A-Za-z]{2,10}/.test(key)) {
                    entries.push({ key, value });
                }
            }
            // Pattern in parentheses within headings: "Ersatz- oder Grundversorgung (EoG)"
            const p = line.match(/\(([^)\s]{2,10})\)/);
            if (p) {
                const k = p[1].trim();
                // best effort: take preceding words as value
                const prefix = line.replace(/\([^)]*\).*/, '').trim();
                if (prefix && /[\p{L}]{3,}/u.test(prefix)) {
                    entries.push({ key: k, value: prefix });
                }
            }
        }
        // Deduplicate by key preserving first value
        const map = new Map();
        for (const e of entries)
            if (!map.has(e.key))
                map.set(e.key, e.value);
        return Array.from(map, ([key, value]) => ({ key, value }));
    }
    chunkMarkdown(md) {
        const out = [];
        const lines = (md || '').split(/\r?\n/);
        let currentHeading;
        let buffer = [];
        let inCode = false;
        const flush = (kind) => {
            const text = buffer.join('\n').trim();
            if (text)
                out.push({ kind, heading: currentHeading, text });
            buffer = [];
        };
        for (const line of lines) {
            if (/^```/.test(line)) {
                if (inCode) {
                    // close
                    buffer.push(line);
                    flush('code');
                    inCode = false;
                }
                else {
                    // open
                    if (buffer.length)
                        flush('paragraph');
                    inCode = true;
                    buffer.push(line);
                }
                continue;
            }
            if (inCode) {
                buffer.push(line);
                continue;
            }
            const h = line.match(/^(#{1,6})\s+(.*)$/);
            if (h) {
                if (buffer.length)
                    flush('paragraph');
                currentHeading = h[2].trim();
                out.push({ kind: 'heading', heading: currentHeading, text: currentHeading });
                continue;
            }
            if (/^\s*([-*+]\s+|\d+\.)/.test(line)) {
                // list item
                if (buffer.length && !/^\s*([-*+]\s+|\d+\.)/.test(buffer[buffer.length - 1])) {
                    flush('paragraph');
                }
                buffer.push(line);
                continue;
            }
            if (line.trim() === '') {
                if (buffer.length)
                    flush(/^\s*([-*+]\s+|\d+\.)/.test(buffer[0]) ? 'list' : 'paragraph');
            }
            else {
                buffer.push(line);
            }
        }
        if (buffer.length)
            flush(/^\s*([-*+]\s+|\d+\.)/.test(buffer[0]) ? 'list' : 'paragraph');
        // Split large paragraphs into ~800-1000 char sub-chunks
        const sized = [];
        const MAX = 1000;
        for (const c of out) {
            if (c.text.length <= MAX || c.kind === 'heading') {
                sized.push(c);
                continue;
            }
            let start = 0;
            while (start < c.text.length) {
                const slice = c.text.slice(start, start + MAX);
                sized.push({ kind: c.kind, heading: c.heading, text: slice });
                start += MAX;
            }
        }
        return sized;
    }
}
exports.MarkdownIngestService = MarkdownIngestService;
exports.default = new MarkdownIngestService();
//# sourceMappingURL=MarkdownIngestService.js.map