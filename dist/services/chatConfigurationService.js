"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatConfigurationService = exports.SearchType = void 0;
const database_1 = require("../utils/database");
const llmProvider_1 = __importDefault(require("./llmProvider"));
const qdrant_1 = require("./qdrant");
const m2cRoleService_1 = __importDefault(require("./m2cRoleService"));
// Environment overrides for vector retrieval tuning
const ENV_VECTOR_LIMIT = parseInt(process.env.CHAT_VECTOR_LIMIT || '', 10);
const ENV_SCORE_THRESHOLD = parseFloat(process.env.CHAT_VECTOR_SCORE_THRESHOLD || '');
function detectCardinalityIntent(text) {
    const processes = Array.from(new Set((text.match(/\b31\d{3}\b/g) || [])));
    const segmentMatch = text.match(/\bPRI\s*\+\s*CAL\b/i); // fokus hier speziell
    const segmentQualifier = (text.match(/PRI\+CAL[^0-9]*(\d{5})/) || [])[1];
    const dataElements = Array.from(new Set((text.match(/\b(\d{4})\b/g) || []).filter(d => /^6\d{3}$/.test(d))));
    const versionHints = Array.from(new Set((text.match(/\b2\.5d\b|\b2\.5[a-z]\b/gi) || [])));
    const docHints = Array.from(new Set((text.match(/INVOIC|REMADV|AHB|EDIFACT/gi) || [])));
    const hasCardMarkers = /(\bM\[\d+\]|\bX\[\d+\])/.test(text);
    const isCardinality = hasCardMarkers && !!(segmentMatch || dataElements.length) && processes.length > 0;
    return { isCardinality, processes, segment: segmentMatch === null || segmentMatch === void 0 ? void 0 : segmentMatch[0], segmentQualifier, dataElements, versionHints, docHints };
}
function buildCardinalityQueries(intent) {
    if (!intent.isCardinality)
        return [];
    const baseSeg = intent.segment ? intent.segment.replace(/\s+/g, '') : '';
    const processes = intent.processes.join(' ');
    const elements = intent.dataElements.join(' ');
    const version = intent.versionHints[0] || '2.5d';
    const docs = intent.docHints.length ? intent.docHints.join(' ') : 'INVOIC REMADV AHB';
    const qualifier = intent.segmentQualifier || '';
    const core = `${docs} ${version} Segment ${baseSeg} ${qualifier} Elemente ${elements} Prozesse ${processes}`.trim();
    const q = [];
    q.push(`${core} Kardinalität Pflicht oder bedingt M oder X`);
    q.push(`${docs} ${version} ${baseSeg} ${qualifier} DE ${elements} Prozesse ${processes} Mandatory vs Conditional`);
    q.push(`${docs} ${version} ${baseSeg} ${qualifier} ${elements} ${processes} M X Definition`);
    q.push(`${docs} ${version} ${baseSeg} ${qualifier} ${elements} Prozesse ${processes} Gültigkeitsregeln`);
    q.push(`${docs} ${version} ${baseSeg} ${qualifier} ${elements} Nutzungsvoraussetzungen`);
    return q;
}
function ensureCoverage(results, intent) {
    var _a;
    if (!intent.isCardinality)
        return true;
    const seg = (_a = intent.segment) === null || _a === void 0 ? void 0 : _a.toUpperCase();
    const has = results.some(r => {
        const payload = r.payload || {};
        const text = (payload.contextual_content || payload.text || payload.content || '').toUpperCase();
        const segOk = seg ? text.includes(seg) : true;
        const elemOk = intent.dataElements.length ? intent.dataElements.some(d => text.includes(d)) : true;
        return segOk && elemOk;
    });
    return has;
}
// Simple token overlap for MMR style diversity
function tokenOverlap(a, b) {
    const ta = new Set(a.split(/\W+/).filter(x => x.length > 2).map(x => x.toLowerCase()));
    const tb = new Set(b.split(/\W+/).filter(x => x.length > 2).map(x => x.toLowerCase()));
    if (!ta.size || !tb.size)
        return 0;
    let inter = 0;
    ta.forEach(t => { if (tb.has(t))
        inter++; });
    return inter / Math.min(ta.size, tb.size);
}
function reRankDiverse(results, limit, lambda = 0.75) {
    var _a, _b, _c, _d, _e, _f;
    if (results.length <= limit)
        return results;
    const scored = results.map(r => { var _a, _b; return ({ r, s: ((_b = (_a = r.merged_score) !== null && _a !== void 0 ? _a : r.score) !== null && _b !== void 0 ? _b : 0) }); });
    scored.sort((a, b) => b.s - a.s);
    const chosen = [];
    const chosenTexts = [];
    while (scored.length && chosen.length < limit) {
        let bestIdx = 0;
        let bestScore = -Infinity;
        for (let i = 0; i < scored.length; i++) {
            const candText = (((_a = scored[i].r.payload) === null || _a === void 0 ? void 0 : _a.contextual_content) || ((_b = scored[i].r.payload) === null || _b === void 0 ? void 0 : _b.text) || ((_c = scored[i].r.payload) === null || _c === void 0 ? void 0 : _c.content) || '').slice(0, 1200);
            let maxSim = 0;
            for (const ct of chosenTexts) {
                const sim = tokenOverlap(candText, ct);
                if (sim > maxSim)
                    maxSim = sim;
                if (maxSim > 0.95)
                    break; // early break
            }
            const mmr = lambda * scored[i].s - (1 - lambda) * maxSim;
            if (mmr > bestScore) {
                bestScore = mmr;
                bestIdx = i;
            }
        }
        const picked = scored.splice(bestIdx, 1)[0];
        chosen.push(picked.r);
        const text = (((_d = picked.r.payload) === null || _d === void 0 ? void 0 : _d.contextual_content) || ((_e = picked.r.payload) === null || _e === void 0 ? void 0 : _e.text) || ((_f = picked.r.payload) === null || _f === void 0 ? void 0 : _f.content) || '').slice(0, 1200);
        chosenTexts.push(text);
    }
    return chosen;
}
function validateCardinalityAnswerText(text, intent) {
    const items = [];
    const lower = text.toLowerCase();
    const disclaimerDetected = /(kein(en)?\s+zugriff|kann.*nicht\s+(be)?antworten|nicht\s+zugänglich|nicht\s+verfügbar)/.test(lower);
    const markerRegex = /(M|X)\s*\[\s*(\d+)\s*\]/i;
    for (const p of intent.processes || []) {
        const idx = text.indexOf(p);
        if (idx === -1) {
            items.push({ process: p, found: false });
            continue;
        }
        // Look for marker within +/- 120 chars window around process mention
        const start = Math.max(0, idx - 120);
        const end = Math.min(text.length, idx + 120);
        const window = text.slice(start, end);
        const m = window.match(markerRegex);
        if (m) {
            items.push({ process: p, found: true, marker: m[0] });
        }
        else {
            // If not in window, as a fallback check anywhere
            const mm = text.match(markerRegex);
            items.push({ process: p, found: !!mm, marker: mm === null || mm === void 0 ? void 0 : mm[0] });
        }
    }
    const missing = items.filter(i => !i.found).map(i => i.process);
    const issues = [];
    if (missing.length)
        issues.push(`Missing per-process marker for: ${missing.join(', ')}`);
    if (disclaimerDetected)
        issues.push('Contains disclaimer about missing access');
    return { ok: issues.length === 0, items, disclaimerDetected, issues };
}
var SearchType;
(function (SearchType) {
    SearchType["SEMANTIC"] = "semantic";
    SearchType["HYBRID"] = "hybrid";
    SearchType["KEYWORD"] = "keyword";
    SearchType["FUZZY"] = "fuzzy";
})(SearchType || (exports.SearchType = SearchType = {}));
class ChatConfigurationService {
    constructor() {
        this.activeConfig = null;
        this.lastConfigLoad = 0;
        this.configCacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.qdrantService = new qdrant_1.QdrantService();
    }
    /**
     * Get the active chat configuration
     */
    async getActiveConfiguration() {
        const now = Date.now();
        // Cache configuration for 5 minutes
        if (this.activeConfig && (now - this.lastConfigLoad) < this.configCacheTimeout) {
            return this.activeConfig;
        }
        try {
            const config = await database_1.DatabaseHelper.executeQuerySingle(`
        SELECT id, name, config
        FROM chat_configurations 
        WHERE is_active = true
        LIMIT 1
      `);
            if (!config) {
                // Return default configuration if no active config found
                return this.getDefaultConfiguration();
            }
            this.activeConfig = config;
            this.lastConfigLoad = now;
            return config;
        }
        catch (error) {
            console.error('Error loading active chat configuration:', error);
            return this.getDefaultConfiguration();
        }
    }
    /**
     * Generate response using the active configuration
     */
    async generateConfiguredResponse(query, userId, previousMessages = [], userPreferences = {}, contextSettings) {
        const config = await this.getActiveConfiguration();
        const processingSteps = [];
        let searchQueries = [query];
        let contextUsed = '';
        // Persist intent across steps
        let detectedCardinality = null;
        try {
            // Step 1: Query Understanding (if enabled)
            if (this.isStepEnabled(config, 'query_understanding')) {
                const step = this.getStep(config, 'query_understanding');
                processingSteps.push({
                    name: 'Query Understanding',
                    startTime: Date.now(),
                    enabled: true,
                    prompt: step === null || step === void 0 ? void 0 : step.prompt
                });
                if (config.config.vectorSearch.useQueryExpansion) {
                    searchQueries = await llmProvider_1.default.generateSearchQueries(query);
                    searchQueries = searchQueries.slice(0, config.config.vectorSearch.maxQueries);
                }
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = { searchQueries };
            }
            // Step 2: Context Search (if enabled)
            if (this.isStepEnabled(config, 'context_search')) {
                processingSteps.push({
                    name: 'Context Search',
                    startTime: Date.now(),
                    enabled: true
                });
                let allResults = [];
                let searchDetails = [];
                // 2.1 Intent Detection (Cardinality)
                const cardinalityIntent = detectCardinalityIntent(query);
                detectedCardinality = cardinalityIntent;
                if (cardinalityIntent.isCardinality) {
                    processingSteps[processingSteps.length - 1].intent = {
                        type: 'cardinality',
                        processes: cardinalityIntent.processes,
                        segment: cardinalityIntent.segment,
                        segmentQualifier: cardinalityIntent.segmentQualifier,
                        dataElements: cardinalityIntent.dataElements,
                        versionHints: cardinalityIntent.versionHints,
                        docHints: cardinalityIntent.docHints
                    };
                }
                // Always use optimized guided retrieval
                try {
                    const isCard = detectedCardinality === null || detectedCardinality === void 0 ? void 0 : detectedCardinality.isCardinality;
                    const baseGuided = await qdrant_1.QdrantService.semanticSearchGuided(query, {
                        limit: Math.max(config.config.vectorSearch.limit, isCard ? 40 : 20),
                        outlineScoping: true,
                        excludeVisual: true
                    });
                    allResults = baseGuided;
                    searchDetails.push({
                        query: query,
                        searchType: 'guided_base',
                        resultsCount: baseGuided.length,
                        results: baseGuided.slice(0, 5).map((r) => {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                            return ({
                                id: r.id,
                                score: (_a = r.score) !== null && _a !== void 0 ? _a : r.merged_score,
                                title: ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.title) || ((_c = r.payload) === null || _c === void 0 ? void 0 : _c.source_document) || 'Unknown',
                                source: ((_e = (_d = r.payload) === null || _d === void 0 ? void 0 : _d.document_metadata) === null || _e === void 0 ? void 0 : _e.document_base_name) || 'Unknown',
                                chunk_type: ((_f = r.payload) === null || _f === void 0 ? void 0 : _f.chunk_type) || 'paragraph',
                                chunk_index: ((_g = r.payload) === null || _g === void 0 ? void 0 : _g.chunk_index) || 0,
                                content: (((_h = r.payload) === null || _h === void 0 ? void 0 : _h.text) || ((_j = r.payload) === null || _j === void 0 ? void 0 : _j.content) || '').substring(0, 300)
                            });
                        })
                    });
                    // 2.2 Strukturierte Zusatzqueries bei Kardinalitäts-Intent
                    if (cardinalityIntent.isCardinality) {
                        const cardQueries = buildCardinalityQueries(cardinalityIntent);
                        const secondaryResults = [];
                        for (const cq of cardQueries.slice(0, 5)) { // begrenzen
                            const r = await qdrant_1.QdrantService.semanticSearchGuided(cq, {
                                limit: Math.max(20, Math.floor(config.config.vectorSearch.limit * 0.9)),
                                outlineScoping: true,
                                excludeVisual: true
                            });
                            secondaryResults.push(...r);
                            searchDetails.push({
                                query: cq,
                                searchType: 'guided_structured',
                                resultsCount: r.length,
                                results: r.slice(0, 3).map((x) => {
                                    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                                    return ({
                                        id: x.id,
                                        score: (_a = x.score) !== null && _a !== void 0 ? _a : x.merged_score,
                                        title: ((_b = x.payload) === null || _b === void 0 ? void 0 : _b.title) || ((_c = x.payload) === null || _c === void 0 ? void 0 : _c.source_document) || 'Unknown',
                                        source: ((_e = (_d = x.payload) === null || _d === void 0 ? void 0 : _d.document_metadata) === null || _e === void 0 ? void 0 : _e.document_base_name) || 'Unknown',
                                        chunk_type: ((_f = x.payload) === null || _f === void 0 ? void 0 : _f.chunk_type) || 'paragraph',
                                        chunk_index: ((_g = x.payload) === null || _g === void 0 ? void 0 : _g.chunk_index) || 0,
                                        content: (((_h = x.payload) === null || _h === void 0 ? void 0 : _h.text) || ((_j = x.payload) === null || _j === void 0 ? void 0 : _j.content) || '').substring(0, 200)
                                    });
                                })
                            });
                        }
                        allResults.push(...secondaryResults);
                    }
                }
                catch (error) {
                    console.error('Guided search failed, falling back to standard search:', error);
                    // Fallback zur Standard-Suche
                    for (const q of searchQueries) {
                        const results = await this.qdrantService.searchByText(q, config.config.vectorSearch.limit, config.config.vectorSearch.scoreThreshold);
                        allResults.push(...results);
                        searchDetails.push({
                            query: q,
                            searchType: 'standard',
                            resultsCount: results.length,
                            results: results.slice(0, 5).map((r) => {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                                return ({
                                    id: r.id,
                                    score: r.score,
                                    title: ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.title) || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.source_document) || 'Unknown',
                                    source: ((_d = (_c = r.payload) === null || _c === void 0 ? void 0 : _c.document_metadata) === null || _d === void 0 ? void 0 : _d.document_base_name) || ((_e = r.payload) === null || _e === void 0 ? void 0 : _e.source) || 'Unknown',
                                    chunk_type: ((_f = r.payload) === null || _f === void 0 ? void 0 : _f.chunk_type) || 'paragraph',
                                    chunk_index: ((_g = r.payload) === null || _g === void 0 ? void 0 : _g.chunk_index) || 0,
                                    content: (((_h = r.payload) === null || _h === void 0 ? void 0 : _h.text) || ((_j = r.payload) === null || _j === void 0 ? void 0 : _j.content) || '').substring(0, 300)
                                });
                            })
                        });
                    }
                }
                // Remove duplicates
                let uniqueResults = this.removeDuplicates(allResults);
                // 2.3 Coverage Check & Fallback (gezielte Plain Vector Suchen, falls Segment/Element fehlen)
                if (!ensureCoverage(uniqueResults, cardinalityIntent) && cardinalityIntent.isCardinality) {
                    const coverageQueries = [];
                    if (cardinalityIntent.segment && cardinalityIntent.dataElements.length) {
                        for (const de of cardinalityIntent.dataElements) {
                            coverageQueries.push(`${cardinalityIntent.segment} ${de} Kardinalität`);
                            coverageQueries.push(`${cardinalityIntent.segment} ${cardinalityIntent.segmentQualifier || ''} DE ${de}`.trim());
                        }
                    }
                    for (const cq of coverageQueries.slice(0, 4)) {
                        try {
                            const r = await this.qdrantService.searchByText(cq, Math.max(12, config.config.vectorSearch.limit / 2), Math.min(0.25, config.config.vectorSearch.scoreThreshold));
                            uniqueResults.push(...r);
                            searchDetails.push({
                                query: cq,
                                searchType: 'coverage_vector',
                                resultsCount: r.length,
                                results: r.slice(0, 2).map((x) => { var _a; return ({ id: x.id, score: x.score, chunk_type: ((_a = x.payload) === null || _a === void 0 ? void 0 : _a.chunk_type) || 'paragraph' }); })
                            });
                        }
                        catch (e) {
                            console.warn('Coverage vector search failed:', e);
                        }
                    }
                    uniqueResults = this.removeDuplicates(uniqueResults);
                }
                // 2.4 Diversitäts-ReRanking (MMR style) – nur wenn viele Treffer
                if (uniqueResults.length > config.config.vectorSearch.limit) {
                    const before = uniqueResults.length;
                    uniqueResults = reRankDiverse(uniqueResults, config.config.vectorSearch.limit, 0.8);
                    searchDetails.push({
                        query: '[RE-RANK]',
                        searchType: 'mmr_diversity',
                        resultsCount: uniqueResults.length,
                        note: `Reduced from ${before} to ${uniqueResults.length}`
                    });
                }
                // Berechne erweiterte Metriken
                const scores = uniqueResults.map((r) => { var _a; return ((_a = r.score) !== null && _a !== void 0 ? _a : r.merged_score); }).filter((s) => s !== undefined);
                const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = {
                    searchDetails,
                    totalResultsFound: allResults.length,
                    uniqueResultsUsed: uniqueResults.length,
                    scoreThreshold: config.config.vectorSearch.scoreThreshold,
                    avgScore: avgScore,
                    searchType: 'guided+enhanced',
                    cardinalityIntent: cardinalityIntent.isCardinality,
                    coverageSatisfied: ensureCoverage(uniqueResults, cardinalityIntent),
                    processesDetected: cardinalityIntent.processes,
                    segmentDetected: cardinalityIntent.segment,
                    elementsDetected: cardinalityIntent.dataElements
                };
                // Step 3: Context Optimization (if enabled)
                if (this.isStepEnabled(config, 'context_optimization')) {
                    processingSteps.push({
                        name: 'Context Optimization',
                        startTime: Date.now(),
                        enabled: true
                    });
                    if (uniqueResults.length > 0) {
                        // chunk-type-bewusste Synthese inkl. pseudocode_* Typen
                        const contextualizedResults = uniqueResults.map(result => {
                            var _a, _b, _c;
                            const chunkType = ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.chunk_type) || 'paragraph';
                            let contextualPrefix = '';
                            switch (chunkType) {
                                case 'structured_table':
                                    contextualPrefix = '[TABELLE] ';
                                    break;
                                case 'definition':
                                    contextualPrefix = '[DEFINITION] ';
                                    break;
                                case 'abbreviation':
                                    contextualPrefix = '[ABKÜRZUNG] ';
                                    break;
                                case 'visual_summary':
                                    contextualPrefix = '[DIAGRAMM-BESCHREIBUNG] ';
                                    break;
                                case 'full_page':
                                    contextualPrefix = '[VOLLTEXT] ';
                                    break;
                                case 'pseudocode_flow':
                                    contextualPrefix = '[PSEUDOCODE-FLOW] ';
                                    break;
                                case 'pseudocode_validations_rules':
                                    contextualPrefix = '[VALIDIERUNGSREGELN] ';
                                    break;
                                case 'pseudocode_functions':
                                    contextualPrefix = '[PSEUDOCODE-FUNKTIONEN] ';
                                    break;
                                case 'pseudocode_table_maps':
                                    contextualPrefix = '[TABELLEN-MAPPINGS] ';
                                    break;
                                case 'pseudocode_entities_segments':
                                    contextualPrefix = '[SEGMENT/ELEMENTE] ';
                                    break;
                                case 'pseudocode_header':
                                    contextualPrefix = '[NACHRICHTEN-HEADER] ';
                                    break;
                                case 'pseudocode_examples':
                                    contextualPrefix = '[BEISPIELE] ';
                                    break;
                                case 'pseudocode_anchors':
                                    contextualPrefix = '[ANKER/HINWEISE] ';
                                    break;
                                default:
                                    contextualPrefix = '[ABSATZ] ';
                            }
                            return {
                                ...result,
                                payload: {
                                    ...result.payload,
                                    contextual_content: contextualPrefix + (((_b = result.payload) === null || _b === void 0 ? void 0 : _b.text) || ((_c = result.payload) === null || _c === void 0 ? void 0 : _c.content) || '')
                                }
                            };
                        });
                        contextUsed = await llmProvider_1.default.synthesizeContextWithChunkTypes(query, contextualizedResults);
                        // Ensure synthesis produced meaningful content
                        if (contextUsed.length < 200) {
                            const relevantContent = uniqueResults.map((r) => {
                                var _a, _b;
                                return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.content) || r.content || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.text) || '';
                            }).filter((text) => text.trim().length > 0);
                            const rawContext = relevantContent.join('\n\n');
                            contextUsed = rawContext.length > config.config.contextSynthesis.maxLength
                                ? rawContext.substring(0, config.config.contextSynthesis.maxLength) + '...'
                                : rawContext;
                        }
                        // If this is a cardinality question, prepend a short primer so the LLM reliably interprets M[n]/X[n]
                        if (detectedCardinality === null || detectedCardinality === void 0 ? void 0 : detectedCardinality.isCardinality) {
                            const primer = [
                                '[Kardinalitäts-Glossar]',
                                'M[n] = Mandatory (Pflicht) mit maximaler Wiederholung n.',
                                'C[n]/X[n] = Conditional/Bedingt (optional bzw. abhängig von Bedingungen) mit maximaler Wiederholung n.',
                                'Die konkrete Pflicht/Bedingung ergibt sich aus AHB/Prozess-Varianten. Nutze ausschließlich den untenstehenden Kontextausschnitt als Quelle.',
                            ].join('\n');
                            contextUsed = primer + '\n\n' + contextUsed;
                        }
                        // Truncate if necessary
                        if (contextUsed.length > config.config.contextSynthesis.maxLength) {
                            contextUsed = contextUsed.substring(0, config.config.contextSynthesis.maxLength) + '...';
                        }
                    }
                    else {
                        contextUsed = '';
                    }
                    processingSteps[processingSteps.length - 1].endTime = Date.now();
                    processingSteps[processingSteps.length - 1].output = {
                        contextLength: contextUsed.length,
                        synthesized: config.config.contextSynthesis.enabled && contextUsed.length > 200,
                        maxLength: config.config.contextSynthesis.maxLength,
                        wasTruncated: contextUsed.endsWith('...'),
                        uniqueResultsUsed: uniqueResults.length,
                        chunkTypesFound: [...new Set(uniqueResults.map((r) => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.chunk_type) || 'paragraph'; }))],
                        optimizedSearchUsed: true
                    };
                }
                else {
                    // Even without optimization, extract proper content
                    const relevantContent = uniqueResults.map((r) => {
                        var _a, _b;
                        return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.content) || r.content || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.text) || '';
                    }).filter((text) => text.trim().length > 0);
                    contextUsed = relevantContent.join('\n\n');
                }
            }
            // Step 3.5: M2C Role Context (if enabled)
            let roleContext = '';
            let roleDetails = null;
            if (this.isStepEnabled(config, 'response_generation')) {
                processingSteps.push({
                    name: 'M2C Role Context',
                    startTime: Date.now(),
                    enabled: true
                });
                try {
                    // Get comprehensive role details for analytics
                    roleDetails = await m2cRoleService_1.default.getUserRoleContextDetails(userId);
                    // Only apply role context if enabled in settings (default: true if not specified)
                    const shouldIncludeM2CRoles = (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeM2CRoles) !== false;
                    if (shouldIncludeM2CRoles) {
                        roleContext = roleDetails.contextGenerated;
                    }
                    if (roleContext) {
                        console.log(`M2C Role context added for user ${userId}: ${roleContext.length} characters from ${roleDetails.selectedRoles.length} roles`);
                    }
                }
                catch (error) {
                    console.warn('Failed to load M2C role context:', error);
                    roleContext = '';
                    roleDetails = {
                        featureEnabled: process.env.ENABLE_M2C_ROLES === 'true',
                        userHasRoles: false,
                        selectedRoleIds: [],
                        selectedRoles: [],
                        contextGenerated: '',
                        contextLength: 0,
                        contextTruncated: false,
                        cacheHit: false,
                        processingTime: 0
                    };
                }
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = {
                    featureEnabled: roleDetails.featureEnabled,
                    userHasRoles: roleDetails.userHasRoles,
                    settingEnabled: (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeM2CRoles) !== false,
                    contextApplied: roleContext.length > 0,
                    selectedRoleCount: roleDetails.selectedRoles.length,
                    selectedRoles: roleDetails.selectedRoles.map((role) => ({
                        id: role.id,
                        name: role.role_name,
                        shortDescription: role.short_description
                    })),
                    contextLength: roleDetails.contextLength,
                    contextGenerated: roleDetails.contextLength > 0,
                    contextTruncated: roleDetails.contextTruncated,
                    contextPreview: roleDetails.contextLength > 0 ?
                        roleDetails.contextGenerated.substring(0, 200) + (roleDetails.contextLength > 200 ? '...' : '') : null,
                    cacheHit: roleDetails.cacheHit,
                    processingTimeMs: roleDetails.processingTime,
                    appliedToPrompt: false, // Will be updated later if actually applied
                    appliedToContext: false, // Will be updated later if actually applied
                    errorOccurred: !roleDetails.featureEnabled && process.env.ENABLE_M2C_ROLES === 'true'
                };
            }
            // Step 4: Response Generation (if enabled)
            let response = '';
            if (this.isStepEnabled(config, 'response_generation')) {
                processingSteps.push({
                    name: 'Response Generation',
                    startTime: Date.now(),
                    enabled: true
                });
                // Prepare messages with custom system prompt – inject concrete instructions as first assistant message
                const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
                messages.push({ role: 'user', content: query });
                // Use the configured system prompt and context mode
                let contextMode = 'standard';
                if (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.useWorkspaceOnly) {
                    contextMode = 'workspace-only';
                }
                else if (contextSettings && !contextSettings.includeSystemKnowledge) {
                    contextMode = 'workspace-only';
                }
                else if (contextSettings && !contextSettings.includeUserDocuments && !contextSettings.includeUserNotes) {
                    contextMode = 'system-only';
                }
                // Enhanced system prompt with role context and domain-specific directives
                let enhancedSystemPrompt = config.config.systemPrompt;
                let roleContextAppliedToPrompt = false;
                if (roleContext) {
                    enhancedSystemPrompt += '\n\n[Benutzer-Rollenkontext]\n' + roleContext;
                    roleContextAppliedToPrompt = true;
                }
                // Cardinality-aware answering directives
                const cardinalityDirectives = (detectedCardinality === null || detectedCardinality === void 0 ? void 0 : detectedCardinality.isCardinality) ? ([
                    '[Antwort-Richtlinie – Kardinalität]',
                    'Aufgabe: Beantworte die Frage direkt und präzise anhand des bereitgestellten Kontexts.',
                    'Wenn für die Vorgänge unterschiedliche Regeln gelten, liste pro Vorgang (z. B. 31002, 31003, 31009) die Markierung für DE 6411 im Segment PRI+CAL 00043 (z. B. M[12] oder X[12]) samt relevanter Bedingungen auf.',
                    'Erkläre kurz die Bedeutung der Markierungen (M/X) nur falls nötig.',
                    'Sage niemals, dass du keinen Zugriff auf das Dokument hast – der relevante Auszug liegt im Kontext vor.',
                    'Wenn der Kontext keine eindeutige Aussage zulässt, gib die wahrscheinlichste Interpretation mit kurzer Begründung aus dem Kontext an und markiere die Unsicherheit explizit.',
                    'Am Ende: gib eine knappe Belegliste (Quelle: Dokumentname/Chunk) aus dem Kontext an.'
                ].join('\n')) : '';
                const systemDirectives = [
                    '[Systemhinweis]',
                    enhancedSystemPrompt,
                    cardinalityDirectives
                ].filter(Boolean).join('\n\n');
                // Prepend as an assisting instruction message
                if (systemDirectives.trim().length > 0) {
                    messages.unshift({ role: 'assistant', content: systemDirectives });
                }
                // Create enhanced context with role information
                let enhancedContext = contextUsed;
                let roleContextAppliedToContext = false;
                if (roleContext && !contextUsed.includes('[Benutzer-Rollenkontext]')) {
                    enhancedContext = roleContext + '\n\n' + contextUsed;
                    roleContextAppliedToContext = true;
                }
                response = await llmProvider_1.default.generateResponse(messages, enhancedContext, userPreferences, false, contextMode);
                // Simple retry logic for cardinality intent: avoid "kein Zugriff" and too-generic answers
                const needsRetry = (() => {
                    if (!(detectedCardinality === null || detectedCardinality === void 0 ? void 0 : detectedCardinality.isCardinality))
                        return false;
                    const text = (response || '').toLowerCase();
                    const hasDisclaimers = /kein(en)?\s+zugriff|kann.*nicht\s+(be)?antworten|nicht\s+zugänglich|nicht\s+verfügbar/.test(text);
                    const tooShort = response.trim().length < 120;
                    const missingMarkers = !/(m\s*\[\d+\]|x\s*\[\d+\])/i.test(response);
                    return hasDisclaimers || (tooShort && missingMarkers);
                })();
                if (needsRetry) {
                    const retryDirectives = [
                        '[Korrektur – Antworte präzise aus dem Kontext]',
                        'Formatiere die Antwort als kurze Liste je Vorgang (31002, 31003, 31009):',
                        '- Vorgang XXXX: DE 6411 im Segment PRI+CAL 00043 = M[12] | X[12] (kurze Begründung aus Kontext)',
                        'Vermeide jegliche Hinweise auf fehlenden Zugriff; nutze den bereitgestellten Kontext. Wenn uneindeutig, gib die wahrscheinlichste Zuordnung mit Begründung an.'
                    ].join('\n');
                    const retryMessages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
                    retryMessages.unshift({ role: 'assistant', content: retryDirectives });
                    retryMessages.push({ role: 'user', content: query });
                    const retried = await llmProvider_1.default.generateResponse(retryMessages, enhancedContext, userPreferences, true, // enhanced
                    contextMode);
                    if (retried && retried.trim().length > response.trim().length * 0.8) {
                        response = retried;
                    }
                }
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = {
                    responseLength: response.length,
                    systemPromptLength: enhancedSystemPrompt.length,
                    systemPromptEnhanced: roleContextAppliedToPrompt,
                    contextLength: enhancedContext.length,
                    contextEnhanced: roleContextAppliedToContext,
                    roleContextUsed: roleContext.length > 0,
                    roleContextLength: roleContext.length,
                    contextMode
                };
                // Update the M2C Role Context step to reflect actual application
                const m2cRoleStep = processingSteps.find(step => step.name === 'M2C Role Context');
                if (m2cRoleStep && m2cRoleStep.output) {
                    m2cRoleStep.output.appliedToPrompt = roleContextAppliedToPrompt;
                    m2cRoleStep.output.appliedToContext = roleContextAppliedToContext;
                }
            }
            else {
                // Fallback to standard generation
                const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
                messages.push({ role: 'user', content: query });
                response = await llmProvider_1.default.generateResponse(messages, contextUsed, userPreferences);
            }
            // Step 5: Response Validation (if enabled)
            if (this.isStepEnabled(config, 'response_validation')) {
                processingSteps.push({
                    name: 'Response Validation',
                    startTime: Date.now(),
                    enabled: true
                });
                let validationIssues = [];
                if (config.config.qualityChecks.enabled) {
                    if (response.length < config.config.qualityChecks.minResponseLength) {
                        validationIssues.push('Response too short');
                    }
                    if (config.config.qualityChecks.checkForHallucination) {
                        // Simple hallucination check
                        if (response.includes('Ich bin mir nicht sicher') ||
                            response.includes('Das kann ich nicht beantworten')) {
                            validationIssues.push('Potential uncertainty detected');
                        }
                    }
                    // Cardinality validator: ensure per-process coverage and presence of M/X markers
                    if (detectedCardinality === null || detectedCardinality === void 0 ? void 0 : detectedCardinality.isCardinality) {
                        const cardEval = validateCardinalityAnswerText(response, detectedCardinality);
                        if (!cardEval.ok) {
                            validationIssues.push(...cardEval.issues);
                        }
                        // Attach details to step output later
                        processingSteps[processingSteps.length - 1].cardinality = cardEval;
                    }
                }
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = {
                    validationIssues,
                    passed: validationIssues.length === 0
                };
                // If validation fails and we have iterations left, we could retry
                // For now, we just log the issues
                if (validationIssues.length > 0) {
                    console.warn('Response validation issues:', validationIssues);
                }
                // Auto-correct loop for cardinality: reformat into strict per-process answer if validator failed
                if (detectedCardinality === null || detectedCardinality === void 0 ? void 0 : detectedCardinality.isCardinality) {
                    const cardMeta = processingSteps[processingSteps.length - 1].cardinality;
                    if (cardMeta && cardMeta.ok === false) {
                        const beforeIssues = Array.isArray(validationIssues) ? [...validationIssues] : [];
                        const processesList = detectedCardinality.processes.join(', ');
                        const seg = detectedCardinality.segment || 'PRI+CAL';
                        const qual = detectedCardinality.segmentQualifier ? ` ${detectedCardinality.segmentQualifier}` : '';
                        const elements = detectedCardinality.dataElements.length ? detectedCardinality.dataElements.join(', ') : '6411';
                        const correctionDirectives = [
                            '[Auto-Korrektur – Kardinalität]',
                            'Erzeuge eine knappe, faktenbasierte Antwort AUSSCHLIESSLICH aus dem bereitgestellten Kontext.',
                            `Pro Vorgang (${processesList}) ausgeben: DE ${elements} in Segment ${seg}${qual} = M[12] oder X[12] (1 Satz Begründung aus Kontext).`,
                            'Formatiere als Liste, eine Zeile je Vorgang. Keine allgemeinen Erläuterungen voranstellen.',
                            'Keine Hinweise auf fehlenden Zugriff; nutze den Kontext unten. Wenn uneindeutig, wahrscheinlichste Zuordnung inkl. kurzer Begründung markieren.',
                            'Am Ende: Belege: maximal 2 knappe Quellhinweise aus dem Kontext (Kapitel/Abschnitt/Quelle), falls erkennbar.'
                        ].join('\n');
                        // Recompute context mode similar to response_generation block
                        let contextMode2 = 'standard';
                        if (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.useWorkspaceOnly) {
                            contextMode2 = 'workspace-only';
                        }
                        else if (contextSettings && !contextSettings.includeSystemKnowledge) {
                            contextMode2 = 'workspace-only';
                        }
                        else if (contextSettings && !contextSettings.includeUserDocuments && !contextSettings.includeUserNotes) {
                            contextMode2 = 'system-only';
                        }
                        const correctionMessages = [
                            { role: 'assistant', content: correctionDirectives },
                            { role: 'user', content: query }
                        ];
                        try {
                            const corrected = await llmProvider_1.default.generateResponse(correctionMessages, contextUsed, userPreferences, true, contextMode2);
                            const afterEval = validateCardinalityAnswerText(corrected, detectedCardinality);
                            const improved = afterEval.ok || (Array.isArray(afterEval.issues) && afterEval.issues.length < beforeIssues.length);
                            processingSteps.push({
                                name: 'Auto-correct (Cardinality)',
                                startTime: Date.now(),
                                enabled: true,
                                endTime: Date.now(),
                                output: {
                                    applied: true,
                                    improved,
                                    beforeIssues,
                                    afterIssues: afterEval.issues,
                                    disclaimerRemoved: !!cardMeta.disclaimerDetected && !afterEval.disclaimerDetected,
                                    preview: corrected.substring(0, 300)
                                }
                            });
                            if (improved && corrected.trim().length >= Math.min(120, response.trim().length)) {
                                response = corrected;
                            }
                        }
                        catch (e) {
                            console.warn('Auto-correct (Cardinality) failed:', e);
                            processingSteps.push({
                                name: 'Auto-correct (Cardinality)',
                                startTime: Date.now(),
                                enabled: true,
                                endTime: Date.now(),
                                output: { applied: false, error: e instanceof Error ? e.message : String(e) }
                            });
                        }
                    }
                }
            }
            return {
                response,
                contextUsed,
                searchQueries,
                processingSteps,
                configurationUsed: config.name
            };
        }
        catch (error) {
            console.error('Error in configured response generation:', error);
            // Fallback to standard generation
            const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
            messages.push({ role: 'user', content: query });
            const fallbackResponse = await llmProvider_1.default.generateResponse(messages, '', userPreferences);
            return {
                response: fallbackResponse,
                contextUsed: '',
                searchQueries: [query],
                processingSteps: [{
                        name: 'Fallback Generation',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        enabled: true
                    }],
                configurationUsed: 'Fallback'
            };
        }
    }
    /**
     * Get the default configuration
     */
    getDefaultConfiguration() {
        return {
            id: 'default',
            name: 'Default Configuration',
            config: {
                maxIterations: 3,
                systemPrompt: 'Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig. Du hilfst bei technischen Fragen zu APERAK, UTILMD, MSCONS und anderen EDI-Nachrichten. Erkläre komplexe Sachverhalte verständlich und gehe auf spezifische Fehlercodes und deren Ursachen ein. Nutze die bereitgestellten Dokumenteninformationen, um präzise und praxisnahe Antworten zu geben.',
                vectorSearch: {
                    maxQueries: 3,
                    // Increased default limit for richer context (keep at least 20)
                    limit: (!isNaN(ENV_VECTOR_LIMIT) && ENV_VECTOR_LIMIT > 0 ? ENV_VECTOR_LIMIT : 20),
                    // Lowered default threshold (retain more candidates for synthesis)
                    scoreThreshold: (!isNaN(ENV_SCORE_THRESHOLD) && ENV_SCORE_THRESHOLD >= 0 ? ENV_SCORE_THRESHOLD : 0.25),
                    useQueryExpansion: true,
                    searchType: SearchType.HYBRID,
                    hybridAlpha: 0.3,
                    diversityThreshold: 0.7
                },
                processingSteps: [
                    {
                        name: 'query_understanding',
                        enabled: true,
                        prompt: 'Analysiere die Benutzeranfrage und extrahiere die Kernfrage.'
                    },
                    {
                        name: 'context_search',
                        enabled: true,
                        prompt: 'Suche relevanten Kontext basierend auf der analysierten Anfrage.'
                    },
                    {
                        name: 'context_optimization',
                        enabled: true,
                        prompt: 'Optimiere und priorisiere den gefundenen Kontext.'
                    },
                    {
                        name: 'response_generation',
                        enabled: true,
                        prompt: 'Erstelle eine hilfreiche Antwort basierend auf dem Kontext.'
                    },
                    {
                        name: 'response_validation',
                        enabled: false,
                        prompt: 'Validiere die Antwort auf Korrektheit und Vollständigkeit.'
                    }
                ],
                contextSynthesis: {
                    enabled: true,
                    maxLength: 4000
                },
                qualityChecks: {
                    enabled: true,
                    minResponseLength: 50,
                    checkForHallucination: true
                }
            }
        };
    }
    /**
     * Check if a processing step is enabled
     */
    isStepEnabled(config, stepName) {
        const step = config.config.processingSteps.find(s => s.name === stepName);
        return step ? step.enabled : false;
    }
    /**
     * Get a processing step
     */
    getStep(config, stepName) {
        return config.config.processingSteps.find(s => s.name === stepName);
    }
    /**
     * Set a configuration as the default (active) configuration
     * Only one configuration can be active at a time
     */
    async setAsDefault(configId) {
        try {
            // First, deactivate all configurations
            await database_1.DatabaseHelper.executeQuery(`
        UPDATE chat_configurations 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
      `);
            // Then activate the selected configuration
            await database_1.DatabaseHelper.executeQuery(`
        UPDATE chat_configurations 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [configId]);
            // Verify the configuration exists
            const verifyResult = await database_1.DatabaseHelper.executeQuerySingle(`
        SELECT id FROM chat_configurations WHERE id = $1
      `, [configId]);
            if (!verifyResult) {
                throw new Error(`Configuration with ID ${configId} not found`);
            }
            // Clear cache to force reload
            this.clearCache();
            console.log(`Configuration ${configId} set as default`);
        }
        catch (error) {
            console.error('Error setting default configuration:', error);
            throw error;
        }
    }
    /**
     * Get the currently active configuration ID
     */
    async getActiveConfigurationId() {
        try {
            const result = await database_1.DatabaseHelper.executeQuerySingle(`
        SELECT id FROM chat_configurations WHERE is_active = true LIMIT 1
      `);
            return (result === null || result === void 0 ? void 0 : result.id) || null;
        }
        catch (error) {
            console.error('Error getting active configuration ID:', error);
            return null;
        }
    }
    /**
     * Remove duplicate results based on ID
     */
    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(result => {
            if (seen.has(result.id)) {
                return false;
            }
            seen.add(result.id);
            return true;
        });
    }
    /**
     * Clear cache (useful for testing)
     */
    clearCache() {
        this.activeConfig = null;
        this.lastConfigLoad = 0;
    }
}
exports.ChatConfigurationService = ChatConfigurationService;
exports.default = new ChatConfigurationService();
//# sourceMappingURL=chatConfigurationService.js.map