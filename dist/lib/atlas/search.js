"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAtlasSearch = void 0;
const WEIGHTS = {
    title: 0.5,
    subtitle: 0.2,
    description: 0.2,
    keywords: 0.1,
};
const TOTAL_WEIGHT = WEIGHTS.title + WEIGHTS.subtitle + WEIGHTS.description + WEIGHTS.keywords;
const normalize = (value) => {
    if (!value) {
        return '';
    }
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
const tokenize = (value) => (value ? value.split(/\s+/) : []);
const indexItems = (items) => items.map((item) => ({
    item,
    title: normalize(item.title),
    subtitle: normalize(item.subtitle),
    description: normalize(item.description),
    keywords: item.keywords.map((keyword) => normalize(keyword)),
}));
const createAtlasSearch = (items) => {
    const indexedItems = indexItems(items);
    const search = (rawQuery, options) => {
        var _a;
        const normalizedQuery = normalize(rawQuery);
        const tokens = tokenize(normalizedQuery);
        const limit = (_a = options === null || options === void 0 ? void 0 : options.limit) !== null && _a !== void 0 ? _a : indexedItems.length;
        if (tokens.length === 0) {
            return indexedItems.slice(0, limit).map((entry) => ({
                item: entry.item,
                score: 1,
            }));
        }
        const matches = indexedItems
            .map((entry) => {
            let score = 0;
            tokens.forEach((token) => {
                if (!token) {
                    return;
                }
                if (entry.title.includes(token)) {
                    score += WEIGHTS.title;
                }
                if (entry.subtitle.includes(token)) {
                    score += WEIGHTS.subtitle;
                }
                if (entry.description.includes(token)) {
                    score += WEIGHTS.description;
                }
                if (entry.keywords.some((keyword) => keyword.includes(token))) {
                    score += WEIGHTS.keywords;
                }
            });
            return {
                item: entry.item,
                score,
            };
        })
            .filter((result) => result.score > 0)
            .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.item.title.localeCompare(b.item.title);
        });
        const maxScore = tokens.length * TOTAL_WEIGHT;
        return matches.slice(0, limit).map((result) => ({
            item: result.item,
            score: maxScore > 0 ? 1 - Math.min(result.score / maxScore, 1) : 1,
        }));
    };
    return {
        search,
    };
};
exports.createAtlasSearch = createAtlasSearch;
//# sourceMappingURL=search.js.map