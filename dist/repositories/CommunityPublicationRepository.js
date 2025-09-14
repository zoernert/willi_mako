"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityPublicationRepository = void 0;
class CommunityPublicationRepository {
    constructor(db) {
        this.db = db;
        this.ensured = false;
        this.map = (row) => {
            var _a, _b, _c, _d;
            return ({
                id: row.id,
                thread_id: row.thread_id,
                slug: row.slug,
                title: row.title,
                summary: row.summary || '',
                published_content: row.published_content,
                source_thread_updated_at: ((_b = (_a = row.source_thread_updated_at) === null || _a === void 0 ? void 0 : _a.toISOString) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(row.source_thread_updated_at).toISOString(),
                published_by_user_id: row.published_by_user_id,
                published_at: ((_d = (_c = row.published_at) === null || _c === void 0 ? void 0 : _c.toISOString) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(row.published_at).toISOString(),
                is_public: !!row.is_public,
            });
        };
    }
    async ensureTable() {
        if (this.ensured)
            return;
        await this.db.query(`
      CREATE TABLE IF NOT EXISTS community_thread_publications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    async createPublication(input) {
        await this.ensureTable();
        const query = `
      INSERT INTO community_thread_publications (
        thread_id, slug, title, summary, published_content, source_thread_updated_at, published_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            input.thread.id,
            input.slug,
            input.title || input.thread.title,
            input.summary || '',
            JSON.stringify(input.thread.document_content),
            new Date(input.thread.updated_at).toISOString(),
            input.publishedByUserId,
        ];
        try {
            const res = await this.db.query(query, values);
            return this.map(res.rows[0]);
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.code) === '42P01') {
                await this.ensureTable();
                const res2 = await this.db.query(query, values);
                return this.map(res2.rows[0]);
            }
            throw e;
        }
    }
    async getBySlug(slug) {
        await this.ensureTable();
        try {
            const res = await this.db.query('SELECT * FROM community_thread_publications WHERE slug = $1 AND is_public = TRUE', [slug]);
            if (res.rows.length === 0)
                return null;
            return this.map(res.rows[0]);
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.code) === '42P01') {
                await this.ensureTable();
                const res2 = await this.db.query('SELECT * FROM community_thread_publications WHERE slug = $1 AND is_public = TRUE', [slug]);
                if (res2.rows.length === 0)
                    return null;
                return this.map(res2.rows[0]);
            }
            throw e;
        }
    }
    async listByThread(threadId) {
        await this.ensureTable();
        try {
            const res = await this.db.query('SELECT * FROM community_thread_publications WHERE thread_id = $1 ORDER BY published_at DESC', [threadId]);
            return res.rows.map(this.map);
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.code) === '42P01') {
                await this.ensureTable();
                const res2 = await this.db.query('SELECT * FROM community_thread_publications WHERE thread_id = $1 ORDER BY published_at DESC', [threadId]);
                return res2.rows.map(this.map);
            }
            throw e;
        }
    }
    async listAllPublic() {
        await this.ensureTable();
        try {
            const res = await this.db.query('SELECT slug, title, published_at, source_thread_updated_at FROM community_thread_publications WHERE is_public = TRUE ORDER BY published_at DESC');
            return res.rows.map((r) => {
                var _a, _b, _c, _d;
                return ({
                    slug: r.slug,
                    title: r.title,
                    published_at: ((_b = (_a = r.published_at) === null || _a === void 0 ? void 0 : _a.toISOString) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(r.published_at).toISOString(),
                    source_thread_updated_at: ((_d = (_c = r.source_thread_updated_at) === null || _c === void 0 ? void 0 : _c.toISOString) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(r.source_thread_updated_at).toISOString(),
                });
            });
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.code) === '42P01') {
                await this.ensureTable();
                const res2 = await this.db.query('SELECT slug, title, published_at, source_thread_updated_at FROM community_thread_publications WHERE is_public = TRUE ORDER BY published_at DESC');
                return res2.rows.map((r) => {
                    var _a, _b, _c, _d;
                    return ({
                        slug: r.slug,
                        title: r.title,
                        published_at: ((_b = (_a = r.published_at) === null || _a === void 0 ? void 0 : _a.toISOString) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(r.published_at).toISOString(),
                        source_thread_updated_at: ((_d = (_c = r.source_thread_updated_at) === null || _c === void 0 ? void 0 : _c.toISOString) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(r.source_thread_updated_at).toISOString(),
                    });
                });
            }
            throw e;
        }
    }
}
exports.CommunityPublicationRepository = CommunityPublicationRepository;
//# sourceMappingURL=CommunityPublicationRepository.js.map