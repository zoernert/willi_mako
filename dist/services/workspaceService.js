"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const database_1 = __importDefault(require("../config/database"));
const notesService_1 = require("./notesService");
const documentProcessor_1 = require("./documentProcessor");
const qdrant_1 = require("./qdrant");
const teamService_1 = require("./teamService");
class WorkspaceService {
    constructor() {
        this.notesService = new notesService_1.NotesService();
        this.documentProcessor = new documentProcessor_1.DocumentProcessorService();
        this.qdrantService = new qdrant_1.QdrantService();
        this.teamService = new teamService_1.TeamService();
    }
    /**
     * Get user workspace settings
     */
    async getUserWorkspaceSettings(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM user_workspace_settings WHERE user_id = $1', [userId]);
            if (result.rows.length === 0) {
                // Create default settings if they don't exist
                return await this.createDefaultSettings(userId);
            }
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Update workspace settings
     */
    async updateWorkspaceSettings(userId, settings) {
        const client = await database_1.default.connect();
        try {
            // Build update query dynamically
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (settings.ai_context_enabled !== undefined) {
                updateFields.push(`ai_context_enabled = $${paramIndex++}`);
                values.push(settings.ai_context_enabled);
            }
            if (settings.auto_tag_enabled !== undefined) {
                updateFields.push(`auto_tag_enabled = $${paramIndex++}`);
                values.push(settings.auto_tag_enabled);
            }
            if (settings.storage_limit_mb !== undefined) {
                updateFields.push(`storage_limit_mb = $${paramIndex++}`);
                values.push(settings.storage_limit_mb);
            }
            if (settings.settings !== undefined) {
                updateFields.push(`settings = $${paramIndex++}`);
                values.push(JSON.stringify(settings.settings));
            }
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(userId);
            const query = `
        UPDATE user_workspace_settings 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramIndex++}
        RETURNING *
      `;
            const result = await client.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('User workspace settings not found');
            }
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Get storage usage information
     */
    async getStorageUsage(userId) {
        const client = await database_1.default.connect();
        try {
            // Get current storage usage and limit
            const settingsResult = await client.query('SELECT storage_used_mb, storage_limit_mb FROM user_workspace_settings WHERE user_id = $1', [userId]);
            let storageUsed = 0;
            let storageLimit = 500; // Default limit
            if (settingsResult.rows.length > 0) {
                storageUsed = settingsResult.rows[0].storage_used_mb || 0;
                storageLimit = settingsResult.rows[0].storage_limit_mb || 500;
            }
            // Recalculate actual storage usage from documents
            const documentsResult = await client.query('SELECT COALESCE(SUM(file_size), 0) as total_size FROM user_documents WHERE user_id = $1', [userId]);
            const actualStorageUsed = Math.round((documentsResult.rows[0].total_size || 0) / 1024 / 1024);
            // Update storage usage if it's different
            if (Math.abs(actualStorageUsed - storageUsed) > 1) {
                await client.query('UPDATE user_workspace_settings SET storage_used_mb = $1 WHERE user_id = $2', [actualStorageUsed, userId]);
                storageUsed = actualStorageUsed;
            }
            const availableMb = Math.max(0, storageLimit - storageUsed);
            const usagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
            return {
                used_mb: storageUsed,
                limit_mb: storageLimit,
                available_mb: availableMb,
                usage_percentage: Math.round(usagePercentage * 100) / 100
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if user has enough storage space
     */
    async checkStorageLimit(userId, additionalSize) {
        const storageInfo = await this.getStorageUsage(userId);
        const additionalMb = Math.ceil(additionalSize / 1024 / 1024);
        return storageInfo.available_mb >= additionalMb;
    }
    /**
     * Get workspace dashboard data
     */
    async getWorkspaceDashboard(userId) {
        const client = await database_1.default.connect();
        try {
            // Get notes count
            const notesCount = await this.notesService.getNotesCount(userId);
            // Get documents count
            const documentsResult = await client.query('SELECT COUNT(*) as count FROM user_documents WHERE user_id = $1', [userId]);
            const documentsCount = parseInt(documentsResult.rows[0].count);
            // Get recent notes
            const recentNotes = await this.notesService.getRecentNotes(userId, 5);
            // Get recent documents
            const recentDocumentsResult = await client.query('SELECT * FROM user_documents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]);
            const recentDocuments = recentDocumentsResult.rows;
            // Get storage info
            const storageInfo = await this.getStorageUsage(userId);
            // Get AI context setting
            const settings = await this.getUserWorkspaceSettings(userId);
            return {
                notes_count: notesCount,
                documents_count: documentsCount,
                recent_notes: recentNotes,
                recent_documents: recentDocuments,
                storage_info: storageInfo,
                ai_context_enabled: settings.ai_context_enabled
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Create default workspace settings for a user
     */
    async createDefaultSettings(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`
        INSERT INTO user_workspace_settings 
        (user_id, ai_context_enabled, auto_tag_enabled, storage_used_mb, storage_limit_mb, settings)
        VALUES ($1, false, true, 0, 500, '{}')
        RETURNING *
      `, [userId]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Get workspace statistics for admin
     */
    async getWorkspaceStats() {
        const client = await database_1.default.connect();
        try {
            const statsResult = await client.query(`
        SELECT 
          COUNT(DISTINCT uws.user_id) as total_users_with_workspace,
          COUNT(DISTINCT ud.id) as total_documents,
          COUNT(DISTINCT un.id) as total_notes,
          COALESCE(SUM(uws.storage_used_mb), 0) as total_storage_used_mb,
          COALESCE(AVG(uws.storage_used_mb), 0) as average_storage_per_user,
          COUNT(DISTINCT CASE WHEN uws.ai_context_enabled = true THEN uws.user_id END) as ai_context_enabled_users
        FROM user_workspace_settings uws
        LEFT JOIN user_documents ud ON uws.user_id = ud.user_id
        LEFT JOIN user_notes un ON uws.user_id = un.user_id
      `);
            const stats = statsResult.rows[0];
            return {
                total_users_with_workspace: parseInt(stats.total_users_with_workspace),
                total_documents: parseInt(stats.total_documents),
                total_notes: parseInt(stats.total_notes),
                total_storage_used_mb: parseFloat(stats.total_storage_used_mb),
                average_storage_per_user: Math.round(parseFloat(stats.average_storage_per_user) * 100) / 100,
                ai_context_enabled_users: parseInt(stats.ai_context_enabled_users)
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Clean up unused storage (remove orphaned files)
     */
    async cleanupStorage(userId) {
        const client = await database_1.default.connect();
        try {
            // Find documents that are marked as deleted or have no file
            const orphanedResult = await client.query(`SELECT id, file_size FROM user_documents 
         WHERE user_id = $1 AND (file_path IS NULL OR file_path = '')`, [userId]);
            let cleanedFiles = 0;
            let freedMb = 0;
            for (const doc of orphanedResult.rows) {
                // Delete document chunks
                await this.documentProcessor.deleteDocumentVectors(doc.id);
                // Delete document record
                await client.query('DELETE FROM user_documents WHERE id = $1', [doc.id]);
                cleanedFiles++;
                freedMb += Math.round((doc.file_size || 0) / 1024 / 1024);
            }
            // Update storage usage
            if (cleanedFiles > 0) {
                await client.query('UPDATE user_workspace_settings SET storage_used_mb = storage_used_mb - $1 WHERE user_id = $2', [freedMb, userId]);
            }
            return {
                cleaned_files: cleanedFiles,
                freed_mb: freedMb
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Export user workspace data
     */
    async exportUserData(userId) {
        const client = await database_1.default.connect();
        try {
            // Get all notes
            const notesResult = await client.query('SELECT * FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
            // Get all documents (metadata only, not file contents)
            const documentsResult = await client.query('SELECT id, title, description, original_name, file_size, mime_type, tags, created_at FROM user_documents WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
            // Get settings
            const settings = await this.getUserWorkspaceSettings(userId);
            return {
                notes: notesResult.rows,
                documents: documentsResult.rows,
                settings: settings
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete all user workspace data
     */
    async deleteUserData(userId) {
        const client = await database_1.default.connect();
        try {
            // Start transaction
            await client.query('BEGIN');
            // Get all documents to delete their vector data
            const documentsResult = await client.query('SELECT id FROM user_documents WHERE user_id = $1', [userId]);
            // Delete vector data for all documents
            for (const doc of documentsResult.rows) {
                await this.documentProcessor.deleteDocumentVectors(doc.id);
            }
            // Delete all user data (cascading will handle related tables)
            await client.query('DELETE FROM user_notes WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM user_documents WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM user_workspace_settings WHERE user_id = $1', [userId]);
            // Commit transaction
            await client.query('COMMIT');
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
     * Get user documents with filters
     */
    async getUserDocuments(userId, filters) {
        const client = await database_1.default.connect();
        try {
            let query = 'SELECT * FROM user_documents WHERE user_id = $1';
            const values = [userId];
            let paramIndex = 2;
            // Apply filters
            if ((filters === null || filters === void 0 ? void 0 : filters.tags) && filters.tags.length > 0) {
                query += ` AND tags ?| $${paramIndex++}`;
                values.push(filters.tags);
            }
            if ((filters === null || filters === void 0 ? void 0 : filters.is_processed) !== undefined) {
                query += ` AND is_processed = $${paramIndex++}`;
                values.push(filters.is_processed);
            }
            if ((filters === null || filters === void 0 ? void 0 : filters.is_ai_context_enabled) !== undefined) {
                query += ` AND is_ai_context_enabled = $${paramIndex++}`;
                values.push(filters.is_ai_context_enabled);
            }
            query += ' ORDER BY created_at DESC';
            if (filters === null || filters === void 0 ? void 0 : filters.limit) {
                query += ` LIMIT $${paramIndex++}`;
                values.push(filters.limit);
            }
            if (filters === null || filters === void 0 ? void 0 : filters.offset) {
                query += ` OFFSET $${paramIndex++}`;
                values.push(filters.offset);
            }
            const result = await client.query(query, values);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get document by ID
     */
    async getDocumentById(documentId, userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update document
     */
    async updateDocument(documentId, userId, updates) {
        const client = await database_1.default.connect();
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (updates.title !== undefined) {
                updateFields.push(`title = $${paramIndex++}`);
                values.push(updates.title);
            }
            if (updates.description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                values.push(updates.description);
            }
            if (updates.tags !== undefined) {
                updateFields.push(`tags = $${paramIndex++}`);
                values.push(JSON.stringify(updates.tags));
            }
            if (updates.is_ai_context_enabled !== undefined) {
                updateFields.push(`is_ai_context_enabled = $${paramIndex++}`);
                values.push(updates.is_ai_context_enabled);
            }
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(documentId, userId);
            const query = `
        UPDATE user_documents 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING *
      `;
            const result = await client.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Document not found');
            }
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete document
     */
    async deleteDocument(documentId, userId) {
        const client = await database_1.default.connect();
        try {
            // Get document info first for storage cleanup
            const docResult = await client.query('SELECT file_size FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            if (docResult.rows.length === 0) {
                throw new Error('Document not found');
            }
            const fileSize = docResult.rows[0].file_size;
            // Delete vector data first
            await this.documentProcessor.deleteDocumentVectors(documentId);
            // Delete document (cascade will handle chunks)
            await client.query('DELETE FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            // Update storage usage
            if (fileSize) {
                await this.updateStorageUsage(userId, -fileSize);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Create document record
     */
    async createDocument(userId, data) {
        const client = await database_1.default.connect();
        try {
            // Check storage limit first
            const hasSpace = await this.checkStorageLimit(userId, data.file_size);
            if (!hasSpace) {
                throw new Error('Storage limit exceeded');
            }
            const result = await client.query(`
        INSERT INTO user_documents 
        (user_id, title, description, file_path, file_size, mime_type, original_name, tags, is_ai_context_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
                userId,
                data.title,
                data.description,
                data.file_path,
                data.file_size,
                data.mime_type,
                data.original_name,
                JSON.stringify(data.tags || []),
                data.is_ai_context_enabled || false
            ]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Get documents that are AI-context enabled for a user
     */
    async getAIContextDocuments(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM user_documents WHERE user_id = $1 AND is_ai_context_enabled = true ORDER BY created_at DESC', [userId]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update storage usage (called after file operations)
     */
    async updateStorageUsage(userId, sizeDeltaBytes) {
        const client = await database_1.default.connect();
        try {
            const sizeDeltaMB = sizeDeltaBytes / 1024 / 1024;
            await client.query(`
        UPDATE user_workspace_settings 
        SET storage_used_mb = storage_used_mb + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `, [sizeDeltaMB, userId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Search across user's workspace content (notes and documents)
     */
    async searchWorkspaceContent(userId, query, type = 'all', limit = 20) {
        const client = await database_1.default.connect();
        try {
            const results = [];
            const searchTerm = `%${query.toLowerCase()}%`;
            // Search documents if type is 'all' or 'documents'
            if (type === 'all' || type === 'documents') {
                // First search by metadata (title, description, etc.)
                const documentQuery = `
          SELECT 
            'document' as type,
            id,
            title,
            description as snippet,
            original_name,
            file_size,
            mime_type,
            created_at,
            tags,
            CASE 
              WHEN LOWER(title) LIKE $2 THEN 1.0
              WHEN LOWER(description) LIKE $2 THEN 0.8
              WHEN LOWER(original_name) LIKE $2 THEN 0.6
              ELSE 0.4
            END as score
          FROM user_documents 
          WHERE user_id = $1 
            AND is_processed = true
            AND (
              LOWER(title) LIKE $2 
              OR LOWER(description) LIKE $2 
              OR LOWER(original_name) LIKE $2
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(
                  CASE 
                    WHEN jsonb_typeof(tags) = 'array' THEN tags 
                    ELSE '[]'::jsonb 
                  END
                ) tag 
                WHERE LOWER(tag) LIKE $2
              )
            )
          ORDER BY score DESC, created_at DESC
          LIMIT $3
        `;
                const docResult = await client.query(documentQuery, [userId, searchTerm, limit]);
                docResult.rows.forEach(row => {
                    results.push({
                        id: row.id,
                        type: 'document',
                        title: row.title,
                        content: row.snippet || 'Keine Beschreibung verfügbar',
                        snippet: row.snippet || 'Keine Beschreibung verfügbar',
                        highlights: [query],
                        score: row.score,
                        metadata: {
                            created_at: row.created_at,
                            file_size: row.file_size,
                            mime_type: row.mime_type,
                            tags: row.tags || []
                        }
                    });
                });
                // Then search document content using Qdrant vector search
                try {
                    const qdrantResults = await this.qdrantService.search(userId, query, Math.min(limit, 10));
                    // Get document metadata for each Qdrant result
                    if (qdrantResults.length > 0) {
                        const documentIds = qdrantResults.map(r => { var _a; return (_a = r.payload) === null || _a === void 0 ? void 0 : _a.document_id; }).filter(Boolean);
                        if (documentIds.length > 0) {
                            const docMetadataQuery = `
                SELECT id, title, original_name, file_size, mime_type, created_at, tags
                FROM user_documents 
                WHERE user_id = $1 AND id = ANY($2::uuid[])
              `;
                            const metadataResult = await client.query(docMetadataQuery, [userId, documentIds]);
                            const metadataMap = new Map(metadataResult.rows.map(row => [row.id, row]));
                            // Add Qdrant results with metadata
                            qdrantResults.forEach(qdrantResult => {
                                var _a, _b, _c;
                                if ((_a = qdrantResult.payload) === null || _a === void 0 ? void 0 : _a.document_id) {
                                    const text = ((_b = qdrantResult.payload) === null || _b === void 0 ? void 0 : _b.text) || ((_c = qdrantResult.payload) === null || _c === void 0 ? void 0 : _c.text_content_sample) || '';
                                    if (text) {
                                        const metadata = metadataMap.get(qdrantResult.payload.document_id);
                                        if (metadata) {
                                            // Check if we already have this document from metadata search
                                            const existingIndex = results.findIndex(r => { var _a; return r.id === ((_a = qdrantResult.payload) === null || _a === void 0 ? void 0 : _a.document_id); });
                                            if (existingIndex >= 0) {
                                                // Update existing result with better content from Qdrant
                                                results[existingIndex].content = text;
                                                results[existingIndex].score = Math.max(results[existingIndex].score, qdrantResult.score || 0.5);
                                            }
                                            else {
                                                // Add new result from Qdrant
                                                results.push({
                                                    id: qdrantResult.payload.document_id,
                                                    type: 'document',
                                                    title: metadata.title || qdrantResult.payload.title || 'Untitled Document',
                                                    content: text,
                                                    snippet: this.truncateText(String(text), 200),
                                                    highlights: [query],
                                                    score: qdrantResult.score || 0.5,
                                                    metadata: {
                                                        created_at: metadata.created_at,
                                                        file_size: metadata.file_size,
                                                        mime_type: metadata.mime_type,
                                                        tags: metadata.tags || []
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
                catch (qdrantError) {
                    console.error('Error searching Qdrant for document content:', qdrantError);
                    // Continue with metadata-only results
                }
            }
            // Search notes if type is 'all' or 'notes'
            if (type === 'all' || type === 'notes') {
                const notesQuery = `
          SELECT 
            'note' as type,
            id,
            title,
            content as snippet,
            created_at,
            tags,
            CASE 
              WHEN LOWER(title) LIKE $2 THEN 1.0
              WHEN LOWER(content) LIKE $2 THEN 0.8
              ELSE 0.4
            END as score
          FROM user_notes 
          WHERE user_id = $1 
            AND (
              LOWER(title) LIKE $2 
              OR LOWER(content) LIKE $2
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(
                  CASE 
                    WHEN jsonb_typeof(tags) = 'array' THEN tags 
                    ELSE '[]'::jsonb 
                  END
                ) tag 
                WHERE LOWER(tag) LIKE $2
              )
            )
          ORDER BY score DESC, created_at DESC
          LIMIT $3
        `;
                const notesResult = await client.query(notesQuery, [userId, searchTerm, limit]);
                notesResult.rows.forEach(row => {
                    results.push({
                        id: row.id,
                        type: 'note',
                        title: row.title,
                        content: row.snippet || '',
                        snippet: this.truncateText(row.snippet || '', 200),
                        highlights: [query],
                        score: row.score,
                        metadata: {
                            created_at: row.created_at,
                            tags: row.tags || []
                        }
                    });
                });
            }
            // Sort all results by score and return top results
            return results
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        }
        finally {
            client.release();
        }
    }
    /**
     * Helper method to truncate text for snippets
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength).trim() + '...';
    }
    /**
     * Team Workspace Methods
     */
    /**
     * Get workspace documents including team members' documents
     */
    async getTeamWorkspaceDocuments(userId) {
        const client = await database_1.default.connect();
        try {
            // Get user's team members including themselves
            const teamMemberIds = await this.getTeamMemberIds(userId);
            if (teamMemberIds.length === 0) {
                // User has no team, return only their documents
                return this.getUserDocuments(userId);
            }
            const result = await client.query(`SELECT ud.*, u.full_name as uploader_name, u.email as uploader_email,
                CASE WHEN ud.user_id = $1 THEN true ELSE false END as is_own_document
         FROM user_documents ud
         JOIN users u ON ud.uploaded_by_user_id = u.id
         WHERE ud.user_id = ANY($2::uuid[])
         ORDER BY ud.created_at DESC`, [userId, teamMemberIds]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Search workspace content across team documents
     */
    async searchTeamWorkspaceContent(userId, query, type = 'all', filters, limit = 20) {
        const client = await database_1.default.connect();
        try {
            let searchUserIds = [userId];
            // Get team member IDs if searching team scope
            if (!(filters === null || filters === void 0 ? void 0 : filters.scope) || filters.scope !== 'own') {
                const teamMemberIds = await this.getTeamMemberIds(userId);
                if (teamMemberIds.length > 0) {
                    searchUserIds = (filters === null || filters === void 0 ? void 0 : filters.scope) === 'team'
                        ? teamMemberIds.filter(id => id !== userId) // Only team members, not self
                        : teamMemberIds; // All including self
                }
            }
            const results = [];
            const searchTerm = `%${query.toLowerCase()}%`;
            // Search documents if type is 'all' or 'documents'
            if (type === 'all' || type === 'documents') {
                const documentQuery = `
          SELECT 
            'document' as type,
            ud.id,
            ud.title,
            ud.description as snippet,
            ud.original_name,
            ud.file_size,
            ud.mime_type,
            ud.created_at,
            ud.tags,
            ud.user_id,
            u.full_name as uploader_name,
            CASE WHEN ud.user_id = $1 THEN true ELSE false END as is_own_document,
            CASE 
              WHEN LOWER(ud.title) LIKE $3 THEN 1.0
              WHEN LOWER(ud.description) LIKE $3 THEN 0.8
              WHEN LOWER(ud.original_name) LIKE $3 THEN 0.6
              ELSE 0.4
            END as score
          FROM user_documents ud 
          JOIN users u ON ud.uploaded_by_user_id = u.id
          WHERE ud.user_id = ANY($2::uuid[])
            AND ud.is_processed = true
            AND (
              LOWER(ud.title) LIKE $3 
              OR LOWER(ud.description) LIKE $3 
              OR LOWER(ud.original_name) LIKE $3
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(
                  CASE 
                    WHEN jsonb_typeof(ud.tags) = 'array' THEN ud.tags 
                    ELSE '[]'::jsonb 
                  END
                ) tag 
                WHERE LOWER(tag) LIKE $3
              )
            )
          ORDER BY score DESC, ud.created_at DESC
          LIMIT $4
        `;
                const docResult = await client.query(documentQuery, [userId, searchUserIds, searchTerm, limit]);
                docResult.rows.forEach(row => {
                    results.push({
                        id: row.id,
                        type: 'document',
                        title: row.title,
                        content: row.snippet || 'Keine Beschreibung verfügbar',
                        snippet: row.snippet || 'Keine Beschreibung verfügbar',
                        highlights: [query],
                        score: row.score,
                        is_own_document: row.is_own_document,
                        uploader_name: row.uploader_name,
                        metadata: {
                            created_at: row.created_at,
                            file_size: row.file_size,
                            mime_type: row.mime_type,
                            tags: row.tags || []
                        }
                    });
                });
            }
            // Search notes - only own notes for now (can be extended later)
            if ((type === 'all' || type === 'notes') && (!(filters === null || filters === void 0 ? void 0 : filters.scope) || filters.scope !== 'team')) {
                const notesQuery = `
          SELECT 
            'note' as type,
            id,
            title,
            content as snippet,
            created_at,
            tags,
            true as is_own_document,
            CASE 
              WHEN LOWER(title) LIKE $2 THEN 1.0
              WHEN LOWER(content) LIKE $2 THEN 0.8
              ELSE 0.4
            END as score
          FROM user_notes 
          WHERE user_id = $1 
            AND (
              LOWER(title) LIKE $2 
              OR LOWER(content) LIKE $2
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(
                  CASE 
                    WHEN jsonb_typeof(tags) = 'array' THEN tags 
                    ELSE '[]'::jsonb 
                  END
                ) tag 
                WHERE LOWER(tag) LIKE $2
              )
            )
          ORDER BY score DESC, created_at DESC
          LIMIT $3
        `;
                const notesResult = await client.query(notesQuery, [userId, searchTerm, limit]);
                notesResult.rows.forEach(row => {
                    results.push({
                        id: row.id,
                        type: 'note',
                        title: row.title,
                        content: row.snippet || '',
                        snippet: this.truncateText(row.snippet || '', 200),
                        highlights: [query],
                        score: row.score,
                        is_own_document: true,
                        uploader_name: null, // Notes don't have uploaders
                        metadata: {
                            created_at: row.created_at,
                            tags: row.tags || []
                        }
                    });
                });
            }
            // Sort all results by score
            results.sort((a, b) => b.score - a.score);
            return results.slice(0, limit);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get team member IDs including the user themselves
     */
    async getTeamMemberIds(userId) {
        try {
            const teamId = await this.teamService.getUserTeamId(userId);
            if (!teamId) {
                return [userId]; // Return only user if not in team
            }
            return await this.teamService.getTeamMemberIds(teamId);
        }
        catch (error) {
            console.error('Error getting team member IDs:', error);
            return [userId]; // Fallback to user only
        }
    }
    /**
     * Get team workspace dashboard data
     */
    async getTeamWorkspaceDashboard(userId) {
        const client = await database_1.default.connect();
        try {
            // Get basic workspace dashboard
            const dashboard = await this.getWorkspaceDashboard(userId);
            // Get team information
            const team = await this.teamService.getTeamByUserId(userId);
            if (!team) {
                return dashboard; // Return basic dashboard if no team
            }
            const isAdmin = await this.teamService.isTeamAdmin(userId, team.id);
            const teamMemberIds = await this.teamService.getTeamMemberIds(team.id);
            // Get team documents count (excluding own documents)
            const teamDocumentsResult = await client.query('SELECT COUNT(*) as count FROM user_documents WHERE user_id = ANY($1::uuid[]) AND user_id != $2', [teamMemberIds, userId]);
            const teamDocumentsCount = parseInt(teamDocumentsResult.rows[0].count);
            // Get recent team documents (excluding own)
            const recentTeamDocsResult = await client.query(`SELECT ud.*, u.full_name as uploader_name
         FROM user_documents ud 
         JOIN users u ON ud.uploaded_by_user_id = u.id
         WHERE ud.user_id = ANY($1::uuid[]) AND ud.user_id != $2
         ORDER BY ud.created_at DESC 
         LIMIT 5`, [teamMemberIds, userId]);
            return Object.assign(Object.assign({}, dashboard), { team_info: {
                    name: team.name,
                    member_count: team.member_count,
                    is_admin: isAdmin
                }, team_documents_count: teamDocumentsCount, team_recent_documents: recentTeamDocsResult.rows });
        }
        finally {
            client.release();
        }
    }
    /**
     * Get a single document by ID for the user
     */
    async getUserDocument(userId, documentId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM user_documents WHERE user_id = $1 AND id = $2', [userId, documentId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            client.release();
        }
    }
}
exports.WorkspaceService = WorkspaceService;
//# sourceMappingURL=workspaceService.js.map