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
const qdrant_1 = require("../services/qdrant");
// Defensive Wrapper: Falls der Import durch Next.js Tree Shaking / Exclude scheitert
let QdrantServiceRef = qdrant_1.QdrantService;
try {
    // Prüfe ob es eine statische Methode ist
    if (!QdrantServiceRef || typeof QdrantServiceRef.searchByText !== 'function') {
        // Versuch eines require (CommonJS) zur Laufzeit
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('../services/qdrant');
        QdrantServiceRef = mod.QdrantService || QdrantServiceRef;
    }
}
catch (e) {
    console.warn('QdrantService dynamic import failed, will use DB fallback only:', (e === null || e === void 0 ? void 0 : e.message) || e);
    QdrantServiceRef = null;
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
        const faqs = await Promise.all(result.rows.map(async (faq) => {
            const slug = generateFAQSlug(faq.title);
            const relatedFAQs = await getRelatedFAQs(faq.id, faq.content + ' ' + faq.answer);
            // Parse tags from JSON string to array
            let parsedTags;
            try {
                parsedTags = typeof faq.tags === 'string' ? JSON.parse(faq.tags) : faq.tags;
            }
            catch (parseError) {
                console.error('Error parsing tags for FAQ', faq.id, ':', parseError);
                parsedTags = ['Energiewirtschaft']; // fallback
            }
            return {
                ...faq,
                tags: parsedTags,
                slug,
                created_at: faq.created_at ? faq.created_at.toISOString() : new Date().toISOString(),
                updated_at: faq.updated_at ? faq.updated_at.toISOString() : new Date().toISOString(),
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
        return result.rows.map(faq => ({
            id: String(faq.id),
            title: faq.title,
            slug: generateFAQSlug(faq.title),
            similarity_score: Math.round((faq.similarity_score || 0) * 100) / 100
        }));
    }
    catch (error) {
        console.error('Error fetching related FAQs from database:', error);
        // Als letzter Fallback: verwende Tag-basierte Suche
        return await getRelatedFAQsByTags(faqId, limit);
    }
}
// Noch einfacherer Fallback: Hole verwandte FAQs basierend auf gemeinsamen Tags
async function getRelatedFAQsByTags(faqId, limit = 5) {
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
        return result.rows.map(faq => ({
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
        return result.rows;
    }
    catch (error) {
        console.warn('Database not available during build, returning empty tags array:', error);
        return [];
    }
}
// Hole FAQs nach Tag
async function getFAQsByTag(tag) {
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
        return Promise.all(result.rows.map(async (faq) => {
            const slug = generateFAQSlug(faq.title);
            const relatedFAQs = await getRelatedFAQs(faq.id, faq.content + ' ' + faq.answer);
            return {
                ...faq,
                slug,
                created_at: faq.created_at ? faq.created_at.toISOString() : new Date().toISOString(),
                updated_at: faq.updated_at ? faq.updated_at.toISOString() : new Date().toISOString(),
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
        return Promise.all(result.rows.map(async (faq) => {
            const slug = generateFAQSlug(faq.title);
            const relatedFAQs = await getRelatedFAQs(faq.id, faq.content + ' ' + faq.answer, 3); // Weniger für RSS
            return {
                ...faq,
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
        return result.rows.map(row => row.tag);
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