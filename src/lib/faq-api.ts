import pool from './database';
import { QdrantService as ImportedQdrantService } from '../services/qdrant';

// Defensive Wrapper: Falls der Import durch Next.js Tree Shaking / Exclude scheitert
let QdrantServiceRef: any = ImportedQdrantService;
try {
  // Prüfe ob es eine statische Methode ist
  if (!QdrantServiceRef || typeof QdrantServiceRef.searchByText !== 'function') {
    // Versuch eines require (CommonJS) zur Laufzeit
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../services/qdrant');
    QdrantServiceRef = mod.QdrantService || QdrantServiceRef;
  }
} catch (e) {
  console.warn('QdrantService dynamic import failed, will use DB fallback only:', (e as any)?.message || e);
  QdrantServiceRef = null;
}

// Hilfsfunktion für semantische Suche (liefert [] bei Nichtverfügbarkeit)
async function safeQdrantSearch(query: string, limit: number, scoreThreshold: number) {
  if (QdrantServiceRef && typeof QdrantServiceRef.searchByText === 'function') {
    try {
      return await QdrantServiceRef.searchByText(query, limit, scoreThreshold);
    } catch (err) {
      console.warn('Qdrant search error, fallback to DB:', (err as any)?.message || err);
      return [];
    }
  }
  return [];
}

export interface StaticFAQData {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  answer: string;
  additional_info?: string;
  tags: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
  related_faqs: RelatedFAQ[];
}

export interface RelatedFAQ {
  id: string;
  title: string;
  slug: string;
  similarity_score?: number;
}

export interface FAQTag {
  tag: string;
  count: number;
}

type FAQDatabaseRow = {
  id: string;
  title: string;
  description: string;
  content: string;
  answer: string;
  additional_info: string | null;
  tags: string[] | string | null;
  view_count: number;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

type FAQSummaryRow = {
  id: string;
  title: string;
  similarity_score?: number | null;
  view_count: number;
};

const normalizeDate = (value: Date | string | null | undefined): string => {
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

const normalizeTags = (rawTags: FAQDatabaseRow['tags']): string[] => {
  let tags: string[] = [];

  if (Array.isArray(rawTags)) {
    tags = rawTags.filter((tag): tag is string => typeof tag === 'string');
  } else if (typeof rawTags === 'string') {
    try {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) {
        tags = parsed.filter((tag): tag is string => typeof tag === 'string');
      }
    } catch (error) {
      console.error('Error parsing FAQ tags:', error);
    }
  }

  return tags.length > 0 ? tags : ['Energiewirtschaft'];
};

// Generiere einen SEO-optimierten Slug aus dem FAQ-Titel
export function generateFAQSlug(title: string): string {
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
export function slugifyTag(tag: string): string {
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
export async function getAllPublicFAQs(): Promise<StaticFAQData[]> {
  try {
    // In development, include private FAQs for testing
    const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
    
    const result = await pool.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true ${publicFilter}
      ORDER BY view_count DESC, created_at DESC
    `);

    const rows = (result?.rows ?? []) as FAQDatabaseRow[];
    const faqs = await Promise.all(
      rows.map(async (faqRow) => {
        const slug = generateFAQSlug(faqRow.title);
        const relatedFAQs = await getRelatedFAQs(faqRow.id, `${faqRow.content} ${faqRow.answer}`);

        return {
          ...faqRow,
          additional_info: faqRow.additional_info ?? undefined,
          tags: normalizeTags(faqRow.tags),
          slug,
          created_at: normalizeDate(faqRow.created_at),
          updated_at: normalizeDate(faqRow.updated_at),
          related_faqs: relatedFAQs
        } satisfies StaticFAQData;
      })
    );

    return faqs;
  } catch (error) {
    console.warn('Database not available during build, returning empty FAQs array:', error);
    return [];
  }
}

// Hole eine spezifische FAQ anhand des Slugs
export async function getFAQBySlug(slug: string): Promise<StaticFAQData | null> {
  const allFAQs = await getAllPublicFAQs();
  return allFAQs.find(faq => faq.slug === slug) || null;
}

// Hole verwandte FAQs über QDrant Vector Search mit Database Fallback
export async function getRelatedFAQs(faqId: string, content: string, limit: number = 5): Promise<RelatedFAQ[]> {
  try {
    const searchResults = await safeQdrantSearch(content, limit + 1, 0.3);
    const validResults = (searchResults || [])
      .filter((result: any) => String(result.id) !== faqId && result.payload?.title)
      .slice(0, limit)
      .map((result: any) => ({
        id: String(result.id),
        title: (result.payload?.title as string) || '',
        slug: generateFAQSlug((result.payload?.title as string) || ''),
        similarity_score: result.score
      }));

    if (validResults.length < limit) {
      if (!searchResults || searchResults.length === 0) {
        console.log('QDrant unavailable or empty, using database fallback');
      } else {
        console.log('QDrant results insufficient, using database fallback');
      }
      return await getRelatedFAQsFromDatabase(faqId, content, limit);
    }
    return validResults;
  } catch (error) {
    console.error('Error fetching related FAQs (semantic), using database fallback:', error);
    return await getRelatedFAQsFromDatabase(faqId, content, limit);
  }
}

// Fallback: Hole verwandte FAQs basierend auf Tags und Keywords aus der Datenbank
async function getRelatedFAQsFromDatabase(faqId: string, content: string, limit: number = 5): Promise<RelatedFAQ[]> {
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
    const result = await pool.query(`
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

    const rows = (result?.rows ?? []) as (FAQSummaryRow & { similarity_score: number | null })[];

    return rows.map((faq) => ({
      id: String(faq.id),
      title: faq.title,
      slug: generateFAQSlug(faq.title),
      similarity_score: Math.round(((faq.similarity_score ?? 0) as number) * 100) / 100
    }));
  } catch (error) {
    console.error('Error fetching related FAQs from database:', error);
    // Als letzter Fallback: verwende Tag-basierte Suche
    return await getRelatedFAQsByTags(faqId, limit);
  }
}

// Noch einfacherer Fallback: Hole verwandte FAQs basierend auf gemeinsamen Tags
async function getRelatedFAQsByTags(faqId: string, limit: number = 5): Promise<RelatedFAQ[]> {
  try {
    // In development, include private FAQs for testing
    const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
    
    // Hole einfach die neuesten FAQs als verwandte FAQs
    const result = await pool.query(`
      SELECT id, title, view_count
      FROM faqs 
      WHERE is_active = true ${publicFilter}
        AND id != $1
      ORDER BY view_count DESC, created_at DESC
      LIMIT $2
    `, [faqId, limit]);

    const rows = (result?.rows ?? []) as FAQSummaryRow[];

    return rows.map((faq) => ({
      id: String(faq.id),
      title: faq.title,
      slug: generateFAQSlug(faq.title),
      similarity_score: 0.8 // Fester Wert für Tag-basierte Ähnlichkeit
    }));
  } catch (error) {
    console.error('Error fetching related FAQs by tags:', error);
    return [];
  }
}

// Hole alle verfügbaren Tags mit Zählungen
export async function getAllTags(): Promise<FAQTag[]> {
  try {
    // In development, include private FAQs for testing
    const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
    
    const result = await pool.query(`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT jsonb_array_elements_text(tags) as tag
        FROM faqs 
        WHERE is_active = true ${publicFilter}
      ) as tag_list
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `);

  const rows = (result?.rows ?? []) as FAQTag[];
  return rows;
  } catch (error) {
    console.warn('Database not available during build, returning empty tags array:', error);
    return [];
  }
}

// Hole FAQs nach Tag
export async function getFAQsByTag(tag: string): Promise<StaticFAQData[]> {
  try {
    // In development, include private FAQs for testing
    const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
    
    // Use case-insensitive matching for tags
    const result = await pool.query(`
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

    const rows = (result?.rows ?? []) as FAQDatabaseRow[];

    return Promise.all(
      rows.map(async (faqRow) => {
        const slug = generateFAQSlug(faqRow.title);
        const relatedFAQs = await getRelatedFAQs(faqRow.id, `${faqRow.content} ${faqRow.answer}`);

        return {
          ...faqRow,
          additional_info: faqRow.additional_info ?? undefined,
          tags: normalizeTags(faqRow.tags),
          slug,
          created_at: normalizeDate(faqRow.created_at),
          updated_at: normalizeDate(faqRow.updated_at),
          related_faqs: relatedFAQs
        };
      })
    );
  } catch (error) {
    console.warn('Database not available during build, returning empty FAQs array for tag:', tag, error);
    return [];
  }
}

// Hole die neuesten FAQs für RSS Feed
export async function getLatestFAQs(limit: number = 20): Promise<StaticFAQData[]> {
  try {
    // In development, include private FAQs for testing
    const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
    
    const result = await pool.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true ${publicFilter}
      ORDER BY updated_at DESC
      LIMIT $1
    `, [limit]);

    const rows = (result?.rows ?? []) as FAQDatabaseRow[];

    return Promise.all(
      rows.map(async (faqRow) => {
        const slug = generateFAQSlug(faqRow.title);
        const relatedFAQs = await getRelatedFAQs(faqRow.id, `${faqRow.content} ${faqRow.answer}`, 3); // Weniger für RSS

        return {
          ...faqRow,
          additional_info: faqRow.additional_info ?? undefined,
          tags: normalizeTags(faqRow.tags),
          slug,
          related_faqs: relatedFAQs
        } as StaticFAQData;
      })
    );
  } catch (error) {
    console.warn('Database not available during build, returning empty latest FAQs array:', error);
    return [];
  }
}

// Hole alle verfügbaren Tags als einfache String-Array
export async function getDistinctTags(): Promise<string[]> {
  try {
    // In development, include private FAQs for testing
    const publicFilter = process.env.NODE_ENV === 'production' ? 'AND is_public = true' : '';
    
    const result = await pool.query(`
      SELECT DISTINCT tag
      FROM (
        SELECT jsonb_array_elements_text(tags) as tag
        FROM faqs 
        WHERE is_active = true ${publicFilter}
      ) as tag_list
      ORDER BY tag ASC
    `);

  const rows = (result?.rows ?? []) as FAQTag[];
  return rows.map((row) => row.tag);
  } catch (error) {
    console.warn('Database not available during build, returning empty distinct tags array:', error);
    return [];
  }
}

// Alias für getAllPublicFAQs für bessere Kompatibilität
export async function getAllFAQs(): Promise<StaticFAQData[]> {
  return getAllPublicFAQs();
}
