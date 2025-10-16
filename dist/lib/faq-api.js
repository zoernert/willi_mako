"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFAQSlug = generateFAQSlug;
exports.slugifyTag = slugifyTag;
exports.getAllPublicFAQs = getAllPublicFAQs;
exports.getFAQBySlug = getFAQBySlug;
exports.getRelatedFAQs = getRelatedFAQs;
exports.getAllTags = getAllTags;
exports.getFAQsByTag = getFAQsByTag;
exports.getLatestFAQs = getLatestFAQs;
exports.getDistinctTags = getDistinctTags;
exports.getAllFAQs = getAllFAQs;
const database_1 = __importDefault(require("./database"));
const loadErrors = [];
const dynamicRequire = (modulePath) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const nativeRequire = eval('require');
        const resolvedModule = nativeRequire(modulePath);
        return ((resolvedModule === null || resolvedModule === void 0 ? void 0 : resolvedModule.QdrantService) || resolvedModule);
    }
    catch (error) {
        loadErrors.push(error);
        return null;
    }
};
const candidateModulePaths = ['../services/qdrant'];
let QdrantServiceRef = null;
for (const pathCandidate of candidateModulePaths) {
    const candidateService = dynamicRequire(pathCandidate);
    if (candidateService && typeof candidateService.searchByText === 'function') {
        QdrantServiceRef = candidateService;
        break;
    }
}
if (!QdrantServiceRef) {
    const lastError = loadErrors.at(-1);
    console.warn('QdrantService dynamic import failed, will use DB fallback only:', lastError instanceof Error ? lastError.message : lastError);
}
// Hilfsfunktion für semantische Suche (liefert [] bei Nichtverfügbarkeit)
async function safeQdrantSearch(query, limit, scoreThreshold) {
    if (QdrantServiceRef && typeof QdrantServiceRef.searchByText === 'function') {
        try {
            return await QdrantServiceRef.searchByText(query, limit, scoreThreshold);
        }
        catch (err) {
            console.warn('Qdrant search error, fallback to DB:', (err === null || err === void 0 ? void 0 : err.message) || err);
            return [];
        }
    }
    return [];
}
const normalizeDate = (value) => {
    if (!value) {
        return new Date().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString();
    }
    return parsed.toISOString();
};
const normalizeTags = (rawTags) => {
    let tags = [];
    if (Array.isArray(rawTags)) {
        tags = rawTags.filter((tag) => typeof tag === 'string');
    }
    else if (typeof rawTags === 'string') {
        try {
            const parsed = JSON.parse(rawTags);
            if (Array.isArray(parsed)) {
                tags = parsed.filter((tag) => typeof tag === 'string');
            }
        }
        catch (error) {
            console.error('Error parsing FAQ tags:', error);
        }
    }
    return tags.length > 0 ? tags : ['Energiewirtschaft'];
};
// Generiere einen SEO-optimierten Slug aus dem FAQ-Titel
function generateFAQSlug(title) {
    return title
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
// Slugify helper for tags/topics to ensure clean URLs
// Mirrors generateFAQSlug behavior but kept semantically separate
function slugifyTag(tag) {
    return (tag || '')
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
// Hole alle öffentlichen FAQs für die statische Generierung
async function getAllPublicFAQs() {
    var _a;
    try {
        // In development, include private FAQs for testing
        const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
        const result = await database_1.default.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true ${publicFilter}
      ORDER BY view_count DESC, created_at DESC
    `);
        const rows = ((_a = result === null || result === void 0 ? void 0 : result.rows) !== null && _a !== void 0 ? _a : []);
        const faqs = await Promise.all(rows.map(async (faqRow) => {
            var _a;
            const slug = generateFAQSlug(faqRow.title);
            const relatedFAQs = await getRelatedFAQs(faqRow.id, `${faqRow.content} ${faqRow.answer}`);
            return {
                ...faqRow,
                additional_info: (_a = faqRow.additional_info) !== null && _a !== void 0 ? _a : null,
                tags: normalizeTags(faqRow.tags),
                slug,
                created_at: normalizeDate(faqRow.created_at),
                updated_at: normalizeDate(faqRow.updated_at),
                related_faqs: relatedFAQs
            };
        }));
        return faqs;
    }
    catch (error) {
        console.warn('Database not available during build, returning empty FAQs array:', error);
        return [];
    }
}
// Hole eine spezifische FAQ anhand des Slugs
async function getFAQBySlug(slug) {
    const allFAQs = await getAllPublicFAQs();
    return allFAQs.find(faq => faq.slug === slug) || null;
}
// Hole verwandte FAQs über QDrant Vector Search mit Database Fallback
async function getRelatedFAQs(faqId, content, limit = 5) {
    try {
        const searchResults = await safeQdrantSearch(content, limit + 1, 0.3);
        const validResults = (searchResults || [])
            .filter((result) => { var _a; return String(result.id) !== faqId && ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.title); })
            .slice(0, limit)
            .map((result) => {
            var _a, _b;
            return ({
                id: String(result.id),
                title: ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.title) || '',
                slug: generateFAQSlug(((_b = result.payload) === null || _b === void 0 ? void 0 : _b.title) || ''),
                similarity_score: result.score
            });
        });
        if (validResults.length < limit) {
            if (!searchResults || searchResults.length === 0) {
                console.log('QDrant unavailable or empty, using database fallback');
            }
            else {
                console.log('QDrant results insufficient, using database fallback');
            }
            return await getRelatedFAQsFromDatabase(faqId, content, limit);
        }
        return validResults;
    }
    catch (error) {
        console.error('Error fetching related FAQs (semantic), using database fallback:', error);
        return await getRelatedFAQsFromDatabase(faqId, content, limit);
    }
}
// Fallback: Hole verwandte FAQs basierend auf Tags und Keywords aus der Datenbank
async function getRelatedFAQsFromDatabase(faqId, content, limit = 5) {
    var _a;
    try {
        // Extrahiere Keywords aus dem Content
        const keywords = content
            .toLowerCase()
            .replace(/[^\w\säöüß]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 10); // Nur die ersten 10 Keywords verwenden
        if (keywords.length === 0) {
            // Falls keine Keywords gefunden, verwende einfache Tag-basierte Suche
            return await getRelatedFAQsByTags(faqId, limit);
        }
        // In development, include private FAQs for testing
        const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
        // Erstelle eine einfachere SQL-Abfrage mit ILIKE
        const result = await database_1.default.query(`
      SELECT id, title, view_count,
             (CASE 
               WHEN LOWER(title) LIKE $2 THEN 0.9
               WHEN LOWER(description) LIKE $2 THEN 0.8
               WHEN LOWER(context) LIKE $2 THEN 0.7
               WHEN LOWER(answer) LIKE $2 THEN 0.6
               ELSE 0.5
             END) as similarity_score
      FROM faqs 
      WHERE is_active = true ${publicFilter}
        AND id != $1
        AND (
          LOWER(title) LIKE $2
          OR LOWER(description) LIKE $2
          OR LOWER(context) LIKE $2
          OR LOWER(answer) LIKE $2
        )
      ORDER BY similarity_score DESC, view_count DESC
      LIMIT $3
    `, [faqId, `%${keywords[0]}%`, limit]);
        const rows = ((_a = result === null || result === void 0 ? void 0 : result.rows) !== null && _a !== void 0 ? _a : []);
        return rows.map((faq) => {
            var _a;
            return ({
                id: String(faq.id),
                title: faq.title,
                slug: generateFAQSlug(faq.title),
                similarity_score: Math.round(((_a = faq.similarity_score) !== null && _a !== void 0 ? _a : 0) * 100) / 100
            });
        });
    }
    catch (error) {
        console.error('Error fetching related FAQs from database:', error);
        // Als letzter Fallback: verwende Tag-basierte Suche
        return await getRelatedFAQsByTags(faqId, limit);
    }
}
// Noch einfacherer Fallback: Hole verwandte FAQs basierend auf gemeinsamen Tags
async function getRelatedFAQsByTags(faqId, limit = 5) {
    var _a;
    try {
        // In development, include private FAQs for testing
        const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
        // Hole einfach die neuesten FAQs als verwandte FAQs
        const result = await database_1.default.query(`
      SELECT id, title, view_count
      FROM faqs 
      WHERE is_active = true ${publicFilter}
        AND id != $1
      ORDER BY view_count DESC, created_at DESC
      LIMIT $2
    `, [faqId, limit]);
        const rows = ((_a = result === null || result === void 0 ? void 0 : result.rows) !== null && _a !== void 0 ? _a : []);
        return rows.map((faq) => ({
            id: String(faq.id),
            title: faq.title,
            slug: generateFAQSlug(faq.title),
            similarity_score: 0.8 // Fester Wert für Tag-basierte Ähnlichkeit
        }));
    }
    catch (error) {
        console.error('Error fetching related FAQs by tags:', error);
        return [];
    }
}
// Hole alle verfügbaren Tags mit Zählungen
async function getAllTags() {
    var _a;
    try {
        // In development, include private FAQs for testing
        const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
        const result = await database_1.default.query(`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT jsonb_array_elements_text(tags) as tag
        FROM faqs 
        WHERE is_active = true ${publicFilter}
      ) as tag_list
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `);
        const rows = ((_a = result === null || result === void 0 ? void 0 : result.rows) !== null && _a !== void 0 ? _a : []);
        return rows;
    }
    catch (error) {
        console.warn('Database not available during build, returning empty tags array:', error);
        return [];
    }
}
// Hole FAQs nach Tag
async function getFAQsByTag(tag) {
    var _a;
    try {
        // In development, include private FAQs for testing
        const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
        // Use case-insensitive matching for tags
        const result = await database_1.default.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true ${publicFilter}
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(tags) AS tag_element
        WHERE LOWER(tag_element) = LOWER($1)
      )
      ORDER BY view_count DESC, created_at DESC
    `, [tag]);
        const rows = ((_a = result === null || result === void 0 ? void 0 : result.rows) !== null && _a !== void 0 ? _a : []);
        return Promise.all(rows.map(async (faqRow) => {
            var _a;
            const slug = generateFAQSlug(faqRow.title);
            const relatedFAQs = await getRelatedFAQs(faqRow.id, `${faqRow.content} ${faqRow.answer}`);
            return {
                ...faqRow,
                additional_info: (_a = faqRow.additional_info) !== null && _a !== void 0 ? _a : null,
                tags: normalizeTags(faqRow.tags),
                slug,
                created_at: normalizeDate(faqRow.created_at),
                updated_at: normalizeDate(faqRow.updated_at),
                related_faqs: relatedFAQs
            };
        }));
    }
    catch (error) {
        console.warn('Database not available during build, returning empty FAQs array for tag:', tag, error);
        return [];
    }
}
// Hole die neuesten FAQs für RSS Feed
async function getLatestFAQs(limit = 20) {
    var _a;
    try {
        // In development, include private FAQs for testing
        const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
        const result = await database_1.default.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true ${publicFilter}
      ORDER BY updated_at DESC
      LIMIT $1
    `, [limit]);
        const rows = ((_a = result === null || result === void 0 ? void 0 : result.rows) !== null && _a !== void 0 ? _a : []);
        return Promise.all(rows.map(async (faqRow) => {
            var _a;
            const slug = generateFAQSlug(faqRow.title);
            const relatedFAQs = await getRelatedFAQs(faqRow.id, `${faqRow.content} ${faqRow.answer}`, 3); // Weniger für RSS
            return {
                ...faqRow,
                additional_info: (_a = faqRow.additional_info) !== null && _a !== void 0 ? _a : null,
                tags: normalizeTags(faqRow.tags),
                slug,
                related_faqs: relatedFAQs
            };
        }));
    }
    catch (error) {
        console.warn('Database not available during build, returning empty latest FAQs array:', error);
        return [];
    }
}
// Hole alle verfügbaren Tags als einfache String-Array
async function getDistinctTags() {
    var _a;
    try {
        // In development, include private FAQs for testing
        const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
        const result = await database_1.default.query(`
      SELECT DISTINCT tag
      FROM (
        SELECT jsonb_array_elements_text(tags) as tag
        FROM faqs 
        WHERE is_active = true ${publicFilter}
      ) as tag_list
      ORDER BY tag ASC
    `);
        const rows = ((_a = result === null || result === void 0 ? void 0 : result.rows) !== null && _a !== void 0 ? _a : []);
        return rows.map((row) => row.tag);
    }
    catch (error) {
        console.warn('Database not available during build, returning empty distinct tags array:', error);
        return [];
    }
}
// Alias für getAllPublicFAQs für bessere Kompatibilität
async function getAllFAQs() {
    return getAllPublicFAQs();
}
//# sourceMappingURL=faq-api.js.map