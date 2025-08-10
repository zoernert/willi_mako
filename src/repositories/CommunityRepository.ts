// Community Repository
// CR-COMMUNITY-HUB-001 - Meilenstein 1
// Autor: AI Assistant
// Datum: 2025-08-09

import { Pool } from 'pg';
import { 
  CommunityThread, 
  DocumentComment, 
  ThreadSummary, 
  CreateThreadRequest, 
  PatchOperation,
  LivingDocument,
  CommunityAuditEntry
} from '../types/community';

export class CommunityRepository {
  constructor(private db: Pool) {}

  /**
   * Create a new community thread
   */
  async createThread(
    request: CreateThreadRequest, 
    userId: string
  ): Promise<CommunityThread> {
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
  async getThreadById(id: string): Promise<CommunityThread | null> {
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
  async listThreads(
    page: number = 1,
    limit: number = 20,
    filters: {
      status?: string;
      tags?: string[];
      search?: string;
    } = {}
  ): Promise<{ threads: ThreadSummary[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
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
  async updateDocument(
    threadId: string,
    operations: PatchOperation[],
    userId: string,
    version?: string
  ): Promise<{ thread: CommunityThread; changed: string[] }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check version for optimistic concurrency control
      if (version) {
        const versionCheck = await client.query(
          'SELECT updated_at FROM community_threads WHERE id = $1',
          [threadId]
        );
        
        if (versionCheck.rows.length === 0) {
          throw new Error('Thread not found');
        }
        
        const currentVersion = versionCheck.rows[0].updated_at.toISOString();
        if (currentVersion !== version) {
          throw new Error(`Version conflict. Current: ${currentVersion}`);
        }
      }

      // Get current document
      const currentResult = await client.query(
        'SELECT document_content FROM community_threads WHERE id = $1',
        [threadId]
      );
      
      if (currentResult.rows.length === 0) {
        throw new Error('Thread not found');
      }

      let documentContent = currentResult.rows[0].document_content;
      const changedSections = new Set<string>();

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
                content: typeof op.value === 'object' ? (op.value as any).content : op.value,
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
              
              const proposalIndex = documentContent.solution_proposals.findIndex(
                (p: any) => p.id === op.proposalId
              );
              
              if (proposalIndex >= 0) {
                // Update existing
                documentContent.solution_proposals[proposalIndex] = {
                  ...documentContent.solution_proposals[proposalIndex],
                  ...(op.value as any),
                  id: op.proposalId // Preserve ID
                };
              } else {
                // Create new
                const newProposal = {
                  id: op.proposalId,
                  created_by: userId,
                  created_at: new Date().toISOString(),
                  ...(op.value as any)
                };
                documentContent.solution_proposals.push(newProposal);
              }
              changedSections.add('solution_proposals');
            }
            break;
        }
      }

      // Update thread
      const updateResult = await client.query(
        `UPDATE community_threads 
         SET document_content = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(documentContent), threadId]
      );

      // Log audit entry
      await this.logAuditEntry(client, threadId, userId, operations);

      await client.query('COMMIT');

      const updatedThread = this.mapRowToThread(updateResult.rows[0]);
      return { 
        thread: updatedThread, 
        changed: Array.from(changedSections) 
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update thread status
   */
  async updateStatus(
    threadId: string, 
    status: string, 
    userId: string
  ): Promise<CommunityThread> {
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
  async createComment(
    threadId: string,
    blockId: string,
    content: string,
    userId: string
  ): Promise<DocumentComment> {
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
  async getCommentsForThread(threadId: string): Promise<DocumentComment[]> {
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
  async deleteThread(threadId: string): Promise<boolean> {
    const query = 'DELETE FROM community_threads WHERE id = $1';
    const result = await this.db.query(query, [threadId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Log audit entry
   */
  private async logAuditEntry(
    client: any,
    threadId: string,
    userId: string,
    operations: PatchOperation[]
  ): Promise<void> {
    const query = `
      INSERT INTO community_thread_audit (thread_id, user_id, ops_json)
      VALUES ($1, $2, $3)
    `;

    await client.query(query, [threadId, userId, JSON.stringify(operations)]);
  }

  /**
   * Map database row to CommunityThread
   */
  private mapRowToThread(row: any): CommunityThread {
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
  private mapRowToThreadSummary(row: any): ThreadSummary {
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
  private mapRowToComment(row: any): DocumentComment {
    return {
      id: row.id,
      thread_id: row.thread_id,
      block_id: row.block_id,
      content: row.content,
      created_by_user_id: row.created_by_user_id,
      created_at: row.created_at.toISOString()
    };
  }
}
