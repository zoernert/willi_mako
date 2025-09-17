"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownIngestService = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const embeddingProvider_1 = require("./embeddingProvider");
const embeddingProvider_2 = require("./embeddingProvider");
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'ewilli';
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
        const slug = (req.slug || this.slugify(req.title)).slice(0, 120);
        const type = (req.type || 'guide');
        const tags = req.tags || [];
        // Extract abbreviation lines first so they become searchable and power the in-memory index
        const abbreviationEntries = this.extractAbbreviations(req.content);
        // Chunk markdown into manageable pieces (by headings and paragraph blocks)
        const chunks = this.chunkMarkdown(req.content);
        const points = [];
        let index = 0;
        // 1) Abbreviations as dedicated points (chunk_type = 'abbreviation')
        for (const abbr of abbreviationEntries) {
            const text = `${abbr.key}: ${abbr.value}`;
            const vector = await (0, embeddingProvider_1.generateEmbedding)(text);
            const id = `md-${slug}-abbr-${abbr.key}`;
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
            const id = `md-${slug}-${index++}`;
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
        await this.client.upsert(COLLECTION_NAME, {
            wait: true,
            points
        });
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