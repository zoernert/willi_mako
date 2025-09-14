import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { CommunityThread } from '../types/community';

export interface CommunityThreadPublication {
  id: string;
  thread_id: string;
  slug: string;
  title: string;
  summary: string;
  published_content: any;
  source_thread_updated_at: string;
  published_by_user_id: string;
  published_at: string;
  is_public: boolean;
}

export class CommunityPublicationRepository {
  constructor(private db: Pool) {}

  private ensured = false;
  private async ensureTable() {
    if (this.ensured) return;
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS community_thread_publications (
        id UUID PRIMARY KEY,
        thread_id UUID NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT DEFAULT '' NOT NULL,
        published_content JSONB NOT NULL,
        source_thread_updated_at TIMESTAMPTZ NOT NULL,
        published_by_user_id UUID NOT NULL REFERENCES users(id),
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_public BOOLEAN NOT NULL DEFAULT TRUE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_community_thread_publications_slug ON community_thread_publications(slug);
      CREATE INDEX IF NOT EXISTS idx_community_thread_publications_thread ON community_thread_publications(thread_id);
      CREATE INDEX IF NOT EXISTS idx_community_thread_publications_published_at ON community_thread_publications(published_at DESC);
    `);
    this.ensured = true;
  }

  async createPublication(input: {
    thread: CommunityThread;
    slug: string;
    title?: string;
    summary?: string;
    publishedByUserId: string;
  }): Promise<CommunityThreadPublication> {
    await this.ensureTable();
    // Upsert-like behavior: if slug exists for the same thread, update it; otherwise insert.
    const selectSQL = `SELECT * FROM community_thread_publications WHERE slug = $1 LIMIT 1`;
    const insertSQL = `
      INSERT INTO community_thread_publications (
        id, thread_id, slug, title, summary, published_content, source_thread_updated_at, published_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const updateSQL = `
      UPDATE community_thread_publications
         SET title = $2,
             summary = $3,
             published_content = $4,
             source_thread_updated_at = $5,
             published_by_user_id = $6,
             published_at = NOW(),
             is_public = TRUE
       WHERE slug = $1
       RETURNING *
    `;

  const nowContent = JSON.stringify(input.thread.document_content);
    const srcUpdatedAt = new Date(input.thread.updated_at).toISOString();
  const newId = randomUUID();

    try {
      const existing = await this.db.query(selectSQL, [input.slug]);
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (row.thread_id !== input.thread.id) {
          // Slug belongs to another thread; do not override.
          throw new Error('Slug already in use by another thread');
        }
        const res = await this.db.query(updateSQL, [
          input.slug,
          input.title || input.thread.title,
          input.summary || '',
          nowContent,
          srcUpdatedAt,
          input.publishedByUserId,
        ]);
        return this.map(res.rows[0]);
      } else {
        const res = await this.db.query(insertSQL, [
          newId,
          input.thread.id,
          input.slug,
          input.title || input.thread.title,
          input.summary || '',
          nowContent,
          srcUpdatedAt,
          input.publishedByUserId,
        ]);
        return this.map(res.rows[0]);
      }
    } catch (e: any) {
      if (e?.code === '42P01') {
        await this.ensureTable();
        // Retry once after ensuring table
        const existing2 = await this.db.query(selectSQL, [input.slug]);
        if (existing2.rows.length > 0) {
          const row = existing2.rows[0];
          if (row.thread_id !== input.thread.id) {
            throw new Error('Slug already in use by another thread');
          }
          const res2 = await this.db.query(updateSQL, [
            input.slug,
            input.title || input.thread.title,
            input.summary || '',
            nowContent,
            srcUpdatedAt,
            input.publishedByUserId,
          ]);
          return this.map(res2.rows[0]);
        } else {
          const res2 = await this.db.query(insertSQL, [
            newId,
            input.thread.id,
            input.slug,
            input.title || input.thread.title,
            input.summary || '',
            nowContent,
            srcUpdatedAt,
            input.publishedByUserId,
          ]);
          return this.map(res2.rows[0]);
        }
      }
      throw e;
    }
  }

  async getBySlug(slug: string): Promise<CommunityThreadPublication | null> {
  await this.ensureTable();
    try {
      const res = await this.db.query('SELECT * FROM community_thread_publications WHERE slug = $1 AND is_public = TRUE', [slug]);
      if (res.rows.length === 0) return null;
      return this.map(res.rows[0]);
    } catch (e: any) {
      if (e?.code === '42P01') {
        await this.ensureTable();
        const res2 = await this.db.query('SELECT * FROM community_thread_publications WHERE slug = $1 AND is_public = TRUE', [slug]);
        if (res2.rows.length === 0) return null;
        return this.map(res2.rows[0]);
      }
      throw e;
    }
  }

  // Admin diagnostic: fetch publication by slug regardless of is_public
  async getAnyBySlug(slug: string): Promise<CommunityThreadPublication | null> {
    await this.ensureTable();
    try {
      const res = await this.db.query('SELECT * FROM community_thread_publications WHERE slug = $1', [slug]);
      if (res.rows.length === 0) return null;
      return this.map(res.rows[0]);
    } catch (e: any) {
      if (e?.code === '42P01') {
        await this.ensureTable();
        const res2 = await this.db.query('SELECT * FROM community_thread_publications WHERE slug = $1', [slug]);
        if (res2.rows.length === 0) return null;
        return this.map(res2.rows[0]);
      }
      throw e;
    }
  }

  async listByThread(threadId: string): Promise<CommunityThreadPublication[]> {
  await this.ensureTable();
    try {
      const res = await this.db.query('SELECT * FROM community_thread_publications WHERE thread_id = $1 ORDER BY published_at DESC', [threadId]);
      return res.rows.map(this.map);
    } catch (e: any) {
      if (e?.code === '42P01') {
        await this.ensureTable();
        const res2 = await this.db.query('SELECT * FROM community_thread_publications WHERE thread_id = $1 ORDER BY published_at DESC', [threadId]);
        return res2.rows.map(this.map);
      }
      throw e;
    }
  }

  async listAllPublic(): Promise<Pick<CommunityThreadPublication, 'slug'|'title'|'published_at'|'source_thread_updated_at'>[]> {
  await this.ensureTable();
    try {
      const res = await this.db.query('SELECT slug, title, published_at, source_thread_updated_at FROM community_thread_publications WHERE is_public = TRUE ORDER BY published_at DESC');
      return res.rows.map((r: any) => ({
        slug: r.slug,
        title: r.title,
        published_at: r.published_at?.toISOString?.() || new Date(r.published_at).toISOString(),
        source_thread_updated_at: r.source_thread_updated_at?.toISOString?.() || new Date(r.source_thread_updated_at).toISOString(),
      }));
    } catch (e: any) {
      if (e?.code === '42P01') {
        await this.ensureTable();
        const res2 = await this.db.query('SELECT slug, title, published_at, source_thread_updated_at FROM community_thread_publications WHERE is_public = TRUE ORDER BY published_at DESC');
        return res2.rows.map((r: any) => ({
          slug: r.slug,
          title: r.title,
          published_at: r.published_at?.toISOString?.() || new Date(r.published_at).toISOString(),
          source_thread_updated_at: r.source_thread_updated_at?.toISOString?.() || new Date(r.source_thread_updated_at).toISOString(),
        }));
      }
      throw e;
    }
  }

  private map = (row: any): CommunityThreadPublication => ({
    id: row.id,
    thread_id: row.thread_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary || '',
    published_content: row.published_content,
    source_thread_updated_at: row.source_thread_updated_at?.toISOString?.() || new Date(row.source_thread_updated_at).toISOString(),
    published_by_user_id: row.published_by_user_id,
    published_at: row.published_at?.toISOString?.() || new Date(row.published_at).toISOString(),
    is_public: !!row.is_public,
  });
}
