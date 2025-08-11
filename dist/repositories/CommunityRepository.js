"use strict";
// Community Repository
// CR-COMMUNITY-HUB-001 - Meilenstein 1
// Autor: AI Assistant
// Datum: 2025-08-09
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityRepository = void 0;
class CommunityRepository {
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new community thread
     */
    async createThread(request, userId) {
        const query = `
      INSERT INTO community_threads (title, document_content, tags, created_by_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const values = [
            request.title,
            JSON.stringify(request.initialContent || {}),
            request.tags || [],
            userId
        ];
        const result = await this.db.query(query, values);
        return this.mapRowToThread(result.rows[0]);
    }
    /**
     * Get thread by ID
     */
    async getThreadById(id) {
        const query = `
      SELECT * FROM community_threads 
      WHERE id = $1
    `;
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToThread(result.rows[0]);
    }
    /**
     * List threads with filtering and pagination
     */
    async listThreads(page = 1, limit = 20, filters = {}) {
        let whereClause = 'WHERE 1=1';
        const values = [];
        let valueIndex = 1;
        // Add filters
        if (filters.status) {
            whereClause += ` AND status = $${valueIndex}`;
            values.push(filters.status);
            valueIndex++;
        }
        if (filters.tags && filters.tags.length > 0) {
            whereClause += ` AND tags && $${valueIndex}`;
            values.push(filters.tags);
            valueIndex++;
        }
        if (filters.search) {
            whereClause += ` AND (title ILIKE $${valueIndex} OR document_content::text ILIKE $${valueIndex})`;
            values.push(`%${filters.search}%`);
            valueIndex++;
        }
        // Count total
        const countQuery = `
      SELECT COUNT(*) as total 
      FROM community_threads 
      ${whereClause}
    `;
        const countResult = await this.db.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const offset = (page - 1) * limit;
        const listQuery = `
      SELECT 
        ct.*,
        COALESCE(
          jsonb_array_length(
            CASE 
              WHEN jsonb_typeof(ct.document_content->'solution_proposals') = 'array' 
              THEN ct.document_content->'solution_proposals' 
              ELSE '[]'::jsonb 
            END
          ), 0
        ) as proposal_count,
        COALESCE(comment_counts.comment_count, 0) as comment_count
      FROM community_threads ct
      LEFT JOIN (
        SELECT thread_id, COUNT(*) as comment_count
        FROM document_comments
        GROUP BY thread_id
      ) comment_counts ON ct.id = comment_counts.thread_id
      ${whereClause}
      ORDER BY ct.updated_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;
        values.push(limit, offset);
        const result = await this.db.query(listQuery, values);
        const threads = result.rows.map(row => this.mapRowToThreadSummary(row));
        return { threads, total };
    }
    /**
     * Update thread document using JSON patch operations
     */
    async updateDocument(threadId, operations, userId, version) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Check version for optimistic concurrency control
            if (version) {
                const versionCheck = await client.query('SELECT updated_at FROM community_threads WHERE id = $1', [threadId]);
                if (versionCheck.rows.length === 0) {
                    throw new Error('Thread not found');
                }
                const currentVersion = versionCheck.rows[0].updated_at.toISOString();
                if (currentVersion !== version) {
                    throw new Error(`Version conflict. Current: ${currentVersion}`);
                }
            }
            // Get current document
            const currentResult = await client.query('SELECT document_content FROM community_threads WHERE id = $1', [threadId]);
            if (currentResult.rows.length === 0) {
                throw new Error('Thread not found');
            }
            let documentContent = currentResult.rows[0].document_content;
            const changedSections = new Set();
            // Apply patch operations
            for (const op of operations) {
                switch (op.op) {
                    case 'replace':
                        if (op.path && op.path.startsWith('/')) {
                            const field = op.path.substring(1);
                            documentContent[field] = op.value;
                            changedSections.add(field);
                        }
                        break;
                    case 'add':
                        if (op.path === '/solution_proposals/-') {
                            if (!documentContent.solution_proposals) {
                                documentContent.solution_proposals = [];
                            }
                            const newProposal = {
                                id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                content: typeof op.value === 'object' ? op.value.content : op.value,
                                created_by: userId,
                                created_at: new Date().toISOString()
                            };
                            documentContent.solution_proposals.push(newProposal);
                            changedSections.add('solution_proposals');
                        }
                        break;
                    case 'upsertProposal':
                        if (op.proposalId && typeof op.value === 'object') {
                            if (!documentContent.solution_proposals) {
                                documentContent.solution_proposals = [];
                            }
                            const proposalIndex = documentContent.solution_proposals.findIndex((p) => p.id === op.proposalId);
                            if (proposalIndex >= 0) {
                                // Update existing
                                documentContent.solution_proposals[proposalIndex] = {
                                    ...documentContent.solution_proposals[proposalIndex],
                                    ...op.value,
                                    id: op.proposalId // Preserve ID
                                };
                            }
                            else {
                                // Create new
                                const newProposal = {
                                    id: op.proposalId,
                                    created_by: userId,
                                    created_at: new Date().toISOString(),
                                    ...op.value
                                };
                                documentContent.solution_proposals.push(newProposal);
                            }
                            changedSections.add('solution_proposals');
                        }
                        break;
                }
            }
            // Update thread
            const updateResult = await client.query(`UPDATE community_threads 
         SET document_content = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`, [JSON.stringify(documentContent), threadId]);
            // Log audit entry
            await this.logAuditEntry(client, threadId, userId, operations);
            await client.query('COMMIT');
            const updatedThread = this.mapRowToThread(updateResult.rows[0]);
            return {
                thread: updatedThread,
                changed: Array.from(changedSections)
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update thread status
     */
    async updateStatus(threadId, status, userId) {
        const query = `
      UPDATE community_threads 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
        const result = await this.db.query(query, [status, threadId]);
        if (result.rows.length === 0) {
            throw new Error('Thread not found');
        }
        return this.mapRowToThread(result.rows[0]);
    }
    /**
     * Create a comment on a thread section
     */
    async createComment(threadId, blockId, content, userId) {
        const query = `
      INSERT INTO document_comments (thread_id, block_id, content, created_by_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const result = await this.db.query(query, [threadId, blockId, content, userId]);
        return this.mapRowToComment(result.rows[0]);
    }
    /**
     * Get comments for a thread
     */
    async getCommentsForThread(threadId) {
        const query = `
      SELECT * FROM document_comments 
      WHERE thread_id = $1
      ORDER BY created_at ASC
    `;
        const result = await this.db.query(query, [threadId]);
        return result.rows.map(row => this.mapRowToComment(row));
    }
    /**
     * Delete a thread (admin only)
     */
    async deleteThread(threadId) {
        const query = 'DELETE FROM community_threads WHERE id = $1';
        const result = await this.db.query(query, [threadId]);
        return (result.rowCount || 0) > 0;
    }
    // ===================================
    // COMMUNITY INITIATIVES (Meilenstein 3)
    // ===================================
    /**
     * Create a new community initiative from a finalized thread
     */
    async createInitiative(threadId, request, draftContent, userId) {
        const query = `
      INSERT INTO community_initiatives (
        thread_id, title, draft_content, target_audience, created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const values = [
            threadId,
            request.title,
            draftContent,
            request.targetAudience || null,
            userId
        ];
        const result = await this.db.query(query, values);
        return this.mapRowToInitiative(result.rows[0]);
    }
    /**
     * Get initiative by ID
     */
    async getInitiativeById(id) {
        const query = `
      SELECT * FROM community_initiatives 
      WHERE id = $1
    `;
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToInitiative(result.rows[0]);
    }
    /**
     * Get initiative by thread ID
     */
    async getInitiativeByThreadId(threadId) {
        const query = `
      SELECT * FROM community_initiatives 
      WHERE thread_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
        const result = await this.db.query(query, [threadId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToInitiative(result.rows[0]);
    }
    /**
     * Update initiative
     */
    async updateInitiative(id, updates) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        if (updates.title !== undefined) {
            setClauses.push(`title = $${paramIndex}`);
            values.push(updates.title);
            paramIndex++;
        }
        if (updates.draft_content !== undefined) {
            setClauses.push(`draft_content = $${paramIndex}`);
            values.push(updates.draft_content);
            paramIndex++;
        }
        if (updates.target_audience !== undefined) {
            setClauses.push(`target_audience = $${paramIndex}`);
            values.push(updates.target_audience);
            paramIndex++;
        }
        if (updates.submission_details !== undefined) {
            setClauses.push(`submission_details = $${paramIndex}`);
            values.push(JSON.stringify(updates.submission_details));
            paramIndex++;
        }
        if (setClauses.length === 0) {
            // No updates to make, return current initiative
            return this.getInitiativeById(id);
        }
        setClauses.push(`updated_at = NOW()`);
        values.push(id); // Add ID for WHERE clause
        const query = `
      UPDATE community_initiatives 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToInitiative(result.rows[0]);
    }
    /**
     * Update initiative status
     */
    async updateInitiativeStatus(id, status, submissionDetails) {
        let query;
        let values;
        if (status === 'submitted') {
            query = `
        UPDATE community_initiatives 
        SET status = $1, submitted_at = NOW(), submission_details = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
            values = [status, JSON.stringify(submissionDetails || {}), id];
        }
        else {
            query = `
        UPDATE community_initiatives 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
            values = [status, id];
        }
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToInitiative(result.rows[0]);
    }
    /**
     * List initiatives with filtering
     */
    async listInitiatives(page = 1, limit = 20, filters = {}) {
        let whereClause = 'WHERE 1=1';
        const values = [];
        let valueIndex = 1;
        if (filters.status) {
            whereClause += ` AND status = $${valueIndex}`;
            values.push(filters.status);
            valueIndex++;
        }
        if (filters.userId) {
            whereClause += ` AND created_by_user_id = $${valueIndex}`;
            values.push(filters.userId);
            valueIndex++;
        }
        // Count total
        const countQuery = `
      SELECT COUNT(*) as total 
      FROM community_initiatives 
      ${whereClause}
    `;
        const countResult = await this.db.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const offset = (page - 1) * limit;
        const listQuery = `
      SELECT * FROM community_initiatives 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;
        values.push(limit, offset);
        const listResult = await this.db.query(listQuery, values);
        const initiatives = listResult.rows.map(row => this.mapRowToInitiative(row));
        return { initiatives, total };
    }
    /**
     * Delete initiative
     */
    async deleteInitiative(id) {
        const query = `
      DELETE FROM community_initiatives 
      WHERE id = $1
    `;
        const result = await this.db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }
    /**
     * Log audit entry
     */
    async logAuditEntry(client, threadId, userId, operations) {
        const query = `
      INSERT INTO community_thread_audit (thread_id, user_id, ops_json)
      VALUES ($1, $2, $3)
    `;
        await client.query(query, [threadId, userId, JSON.stringify(operations)]);
    }
    /**
     * Map database row to CommunityThread
     */
    mapRowToThread(row) {
        return {
            id: row.id,
            title: row.title,
            status: row.status,
            tags: row.tags || [],
            document_content: row.document_content || {},
            created_by_user_id: row.created_by_user_id,
            created_at: row.created_at.toISOString(),
            updated_at: row.updated_at.toISOString()
        };
    }
    /**
     * Map database row to ThreadSummary
     */
    mapRowToThreadSummary(row) {
        return {
            id: row.id,
            title: row.title,
            status: row.status,
            tags: row.tags || [],
            created_at: row.created_at.toISOString(),
            updated_at: row.updated_at.toISOString(),
            proposal_count: parseInt(row.proposal_count || '0'),
            comment_count: parseInt(row.comment_count || '0')
        };
    }
    /**
     * Map database row to DocumentComment
     */
    mapRowToComment(row) {
        return {
            id: row.id,
            thread_id: row.thread_id,
            block_id: row.block_id,
            content: row.content,
            created_by_user_id: row.created_by_user_id,
            created_at: row.created_at.toISOString()
        };
    }
    /**
     * Map database row to CommunityInitiative
     */
    mapRowToInitiative(row) {
        var _a;
        return {
            id: row.id,
            thread_id: row.thread_id,
            title: row.title,
            draft_content: row.draft_content,
            status: row.status,
            target_audience: row.target_audience,
            submission_details: row.submission_details || {},
            created_by_user_id: row.created_by_user_id,
            created_at: row.created_at.toISOString(),
            updated_at: row.updated_at.toISOString(),
            submitted_at: (_a = row.submitted_at) === null || _a === void 0 ? void 0 : _a.toISOString()
        };
    }
}
exports.CommunityRepository = CommunityRepository;
//# sourceMappingURL=CommunityRepository.js.map