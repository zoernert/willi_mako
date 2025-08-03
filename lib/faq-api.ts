import pool from './database';
import { QdrantService } from '../src/services/qdrant';

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

// Hole alle öffentlichen FAQs für die statische Generierung
export async function getAllPublicFAQs(): Promise<StaticFAQData[]> {
  try {
    const result = await pool.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true AND is_public = true
      ORDER BY view_count DESC, created_at DESC
    `);

    const faqs = await Promise.all(
      result.rows.map(async (faq) => {
        const slug = generateFAQSlug(faq.title);
        const relatedFAQs = await getRelatedFAQs(faq.id, faq.content + ' ' + faq.answer);
        
        return {
          ...faq,
          slug,
          related_faqs: relatedFAQs
        };
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

// Hole verwandte FAQs über QDrant Vector Search
export async function getRelatedFAQs(faqId: string, content: string, limit: number = 5): Promise<RelatedFAQ[]> {
  try {
    // Verwende QdrantService für semantische Suche
    const searchResults = await QdrantService.searchByText(content, limit + 1, 0.3);
    
    // Filtere die ursprüngliche FAQ heraus und konvertiere zu RelatedFAQ
    const related = searchResults
      .filter(result => String(result.id) !== faqId)
      .slice(0, limit)
      .map(result => ({
        id: String(result.id),
        title: (result.payload?.title as string) || '',
        slug: generateFAQSlug((result.payload?.title as string) || ''),
        similarity_score: result.score
      }));

    return related;
  } catch (error) {
    console.error('Error fetching related FAQs:', error);
    return [];
  }
}

// Hole alle verfügbaren Tags mit Zählungen
export async function getAllTags(): Promise<FAQTag[]> {
  try {
    const result = await pool.query(`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT jsonb_array_elements_text(tags) as tag
        FROM faqs 
        WHERE is_active = true AND is_public = true
      ) as tag_list
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `);

    return result.rows;
  } catch (error) {
    console.warn('Database not available during build, returning empty tags array:', error);
    return [];
  }
}

// Hole FAQs nach Tag
export async function getFAQsByTag(tag: string): Promise<StaticFAQData[]> {
  try {
    const result = await pool.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true AND is_public = true 
      AND tags @> $1
      ORDER BY view_count DESC, created_at DESC
    `, [JSON.stringify([tag])]);

    return Promise.all(
      result.rows.map(async (faq) => {
        const slug = generateFAQSlug(faq.title);
        const relatedFAQs = await getRelatedFAQs(faq.id, faq.content + ' ' + faq.answer);
        
        return {
          ...faq,
          slug,
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
    const result = await pool.query(`
      SELECT id, title, description, context as content, answer, additional_info, 
             tags, view_count, created_at, updated_at
      FROM faqs 
      WHERE is_active = true AND is_public = true
      ORDER BY updated_at DESC
      LIMIT $1
    `, [limit]);

    return Promise.all(
      result.rows.map(async (faq) => {
        const slug = generateFAQSlug(faq.title);
        const relatedFAQs = await getRelatedFAQs(faq.id, faq.content + ' ' + faq.answer, 3); // Weniger für RSS
        
        return {
          ...faq,
          slug,
          related_faqs: relatedFAQs
        };
      })
    );
  } catch (error) {
    console.warn('Database not available during build, returning empty latest FAQs array:', error);
    return [];
  }
}
