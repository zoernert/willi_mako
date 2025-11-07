"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrievalService = exports.RetrievalService = void 0;
const qdrant_1 = require("../qdrant");
const DEFAULT_LIMIT = 20;
class RetrievalService {
    async semanticSearch(query, options = {}) {
        return this.semanticSearchByCollection(query, options, 'willi_mako');
    }
    async semanticSearchWilliNetz(query, options = {}) {
        return this.semanticSearchByCollection(query, options, 'willi-netz');
    }
    async semanticSearchCombined(query, options = {}) {
        var _a;
        const startedAt = Date.now();
        const limit = (_a = options.limit) !== null && _a !== void 0 ? _a : DEFAULT_LIMIT;
        // Suche parallel in beiden Collections
        const [resultsWilliMako, resultsWilliNetz] = await Promise.all([
            qdrant_1.QdrantService.semanticSearchGuidedByCollection(query, options, 'willi_mako'),
            qdrant_1.QdrantService.semanticSearchGuidedByCollection(query, options, 'willi-netz')
        ]);
        // Kombiniere Ergebnisse und markiere die Quelle
        const combinedResults = [
            ...resultsWilliMako.map((item) => ({ ...item, sourceCollection: 'willi_mako' })),
            ...resultsWilliNetz.map((item) => ({ ...item, sourceCollection: 'willi-netz' }))
        ];
        // Sortiere nach Score
        combinedResults.sort((a, b) => {
            var _a, _b, _c, _d;
            const scoreA = (_b = (_a = a.merged_score) !== null && _a !== void 0 ? _a : a.score) !== null && _b !== void 0 ? _b : 0;
            const scoreB = (_d = (_c = b.merged_score) !== null && _c !== void 0 ? _c : b.score) !== null && _d !== void 0 ? _d : 0;
            return scoreB - scoreA;
        });
        // Limitiere auf die gewünschte Anzahl
        const limitedResults = combinedResults.slice(0, limit);
        const durationMs = Date.now() - startedAt;
        const mapped = this.mapResults(limitedResults);
        return {
            query,
            totalResults: mapped.length,
            durationMs,
            options: {
                limit,
                alpha: options.alpha,
                outlineScoping: options.outlineScoping !== false,
                excludeVisual: options.excludeVisual !== false
            },
            results: mapped
        };
    }
    async semanticSearchByCollection(query, options = {}, collection) {
        var _a;
        const startedAt = Date.now();
        const results = await qdrant_1.QdrantService.semanticSearchGuidedByCollection(query, options, collection);
        const durationMs = Date.now() - startedAt;
        const limit = (_a = options.limit) !== null && _a !== void 0 ? _a : DEFAULT_LIMIT;
        const mapped = this.mapResults(results);
        return {
            query,
            totalResults: mapped.length,
            durationMs,
            options: {
                limit,
                alpha: options.alpha,
                outlineScoping: options.outlineScoping !== false,
                excludeVisual: options.excludeVisual !== false
            },
            results: mapped
        };
    }
    mapResults(results) {
        return results.map((item, index) => {
            var _a, _b, _c, _d, _e;
            const idValue = item === null || item === void 0 ? void 0 : item.id;
            const id = typeof idValue === 'object' ? (_c = (_a = idValue === null || idValue === void 0 ? void 0 : idValue.uuid) !== null && _a !== void 0 ? _a : (_b = idValue === null || idValue === void 0 ? void 0 : idValue.toString) === null || _b === void 0 ? void 0 : _b.call(idValue)) !== null && _c !== void 0 ? _c : String(idValue) : String(idValue);
            const mergedScore = typeof (item === null || item === void 0 ? void 0 : item.merged_score) === 'number' ? item.merged_score : null;
            const originalScore = typeof (item === null || item === void 0 ? void 0 : item.score) === 'number' ? item.score : null;
            const payload = (_d = item === null || item === void 0 ? void 0 : item.payload) !== null && _d !== void 0 ? _d : {};
            const text = typeof (payload === null || payload === void 0 ? void 0 : payload.text) === 'string' ? payload.text : typeof (payload === null || payload === void 0 ? void 0 : payload.content) === 'string' ? payload.content : typeof (payload === null || payload === void 0 ? void 0 : payload.contextual_content) === 'string' ? payload.contextual_content : null;
            const sourceCollection = item === null || item === void 0 ? void 0 : item.sourceCollection;
            return {
                id,
                score: mergedScore !== null && mergedScore !== void 0 ? mergedScore : originalScore,
                payload: sourceCollection ? { ...payload, sourceCollection } : payload,
                highlight: text ? text.slice(0, 500) : null,
                metadata: {
                    rank: index + 1,
                    originalScore,
                    mergedScore,
                    version: (_e = item === null || item === void 0 ? void 0 : item.version) !== null && _e !== void 0 ? _e : null
                }
            };
        });
    }
}
exports.RetrievalService = RetrievalService;
exports.retrievalService = new RetrievalService();
//# sourceMappingURL=retrieval.service.js.map