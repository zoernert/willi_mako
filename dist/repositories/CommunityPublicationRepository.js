"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityPublicationRepository = void 0;
class CommunityPublicationRepository {
    constructor(db) {
        this.db = db;
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
    async createPublication(input) {
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
        const res = await this.db.query(query, values);
        return this.map(res.rows[0]);
    }
    async getBySlug(slug) {
        const res = await this.db.query('SELECT * FROM community_thread_publications WHERE slug = $1 AND is_public = TRUE', [slug]);
        if (res.rows.length === 0)
            return null;
        return this.map(res.rows[0]);
    }
    async listByThread(threadId) {
        const res = await this.db.query('SELECT * FROM community_thread_publications WHERE thread_id = $1 ORDER BY published_at DESC', [threadId]);
        return res.rows.map(this.map);
    }
}
exports.CommunityPublicationRepository = CommunityPublicationRepository;
//# sourceMappingURL=CommunityPublicationRepository.js.map