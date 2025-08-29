"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbeddingProvider = getEmbeddingProvider;
exports.getEmbeddingDimension = getEmbeddingDimension;
exports.getCollectionName = getCollectionName;
exports.generateEmbedding = generateEmbedding;
exports.generateHypotheticalAnswer = generateHypotheticalAnswer;
const gemini_1 = __importDefault(require("./gemini"));
const mistralai_1 = __importDefault(require("@mistralai/mistralai"));
const PROVIDER = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
const DEFAULT_GEMINI_DIM = Number(process.env.GEMINI_EMBED_DIM || 768);
const DEFAULT_MISTRAL_DIM = Number(process.env.MISTRAL_EMBED_DIM || 1024);
function getEmbeddingProvider() {
    return PROVIDER === 'mistral' ? 'mistral' : 'gemini';
}
function getEmbeddingDimension() {
    return getEmbeddingProvider() === 'mistral' ? DEFAULT_MISTRAL_DIM : DEFAULT_GEMINI_DIM;
}
function getCollectionName(baseCollection) {
    return getEmbeddingProvider() === 'mistral' ? `${baseCollection}_mistral` : baseCollection;
}
async function generateEmbedding(text) {
    var _a, _b, _c, _d;
    const provider = getEmbeddingProvider();
    if (provider === 'gemini') {
        return await gemini_1.default.generateEmbedding(text);
    }
    // mistral
    if (!MISTRAL_API_KEY)
        throw new Error('MISTRAL_API_KEY missing');
    // Prefer SDK if available
    try {
        const mistral = new mistralai_1.default(MISTRAL_API_KEY);
        if ((mistral === null || mistral === void 0 ? void 0 : mistral.embeddings) && typeof mistral.embeddings.create === 'function') {
            const res = await mistral.embeddings.create({ model: process.env.MISTRAL_EMBED_MODEL || 'mistral-embed', input: text.length > 8000 ? text.slice(0, 8000) : text });
            const vec = (_b = (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.embedding;
            if (Array.isArray(vec))
                return vec;
        }
    }
    catch (_e) { }
    // REST fallback
    const resp = await fetch('https://api.mistral.ai/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: process.env.MISTRAL_EMBED_MODEL || 'mistral-embed', input: text.length > 8000 ? text.slice(0, 8000) : text })
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Mistral embeddings HTTP ${resp.status}: ${txt}`);
    }
    const json = await resp.json();
    const vec = (_d = (_c = json === null || json === void 0 ? void 0 : json.data) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.embedding;
    if (!Array.isArray(vec))
        throw new Error('Mistral embeddings response missing embedding');
    return vec;
}
async function generateHypotheticalAnswer(query) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const provider = getEmbeddingProvider();
    if (provider === 'gemini') {
        return await gemini_1.default.generateHypotheticalAnswer(query);
    }
    // For mistral, use chat completions to synthesize a HyDE answer
    if (!MISTRAL_API_KEY)
        return query;
    const prompt = `Du bist Experte für die deutsche Energiewirtschaft. Antworte prägnant und fachlich korrekt auf die folgende Frage ausschließlich basierend auf allgemeinem Wissen. Gib nur die Antwort ohne Einleitung.\n\nFrage: ${query}`;
    // Try SDK first
    try {
        const mistral = new mistralai_1.default(MISTRAL_API_KEY);
        if (typeof ((_a = mistral.chat) === null || _a === void 0 ? void 0 : _a.complete) === 'function') {
            const res = await mistral.chat.complete({
                model: process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest',
                messages: [{ role: 'user', content: prompt }]
            });
            const text = ((_c = (_b = res === null || res === void 0 ? void 0 : res.output) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) || ((_f = (_e = (_d = res === null || res === void 0 ? void 0 : res.choices) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.content);
            if (typeof text === 'string' && text.trim())
                return text.trim();
        }
    }
    catch (_k) { }
    // REST fallback
    const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }]
        })
    });
    if (!resp.ok) {
        const txt = await resp.text();
        console.warn(`Mistral chat HTTP ${resp.status}: ${txt}`);
        return query; // fallback: no HyDE
    }
    const data = await resp.json();
    const content = (_j = (_h = (_g = data === null || data === void 0 ? void 0 : data.choices) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.message) === null || _j === void 0 ? void 0 : _j.content;
    return typeof content === 'string' && content.trim() ? content.trim() : query;
}
//# sourceMappingURL=embeddingProvider.js.map