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
    async getUserWorkspaceSettings(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM user_workspace_settings WHERE user_id = $1', [userId]);
            if (result.rows.length === 0) {
                return await this.createDefaultSettings(userId);
            }
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    async updateWorkspaceSettings(userId, settings) {
        const client = await database_1.default.connect();
        try {
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
    async getStorageUsage(userId) {
        const client = await database_1.default.connect();
        try {
            const settingsResult = await client.query('SELECT storage_used_mb, storage_limit_mb FROM user_workspace_settings WHERE user_id = $1', [userId]);
            let storageUsed = 0;
            let storageLimit = 500;
            if (settingsResult.rows.length > 0) {
                storageUsed = settingsResult.rows[0].storage_used_mb || 0;
                storageLimit = settingsResult.rows[0].storage_limit_mb || 500;
            }
            const documentsResult = await client.query('SELECT COALESCE(SUM(file_size), 0) as total_size FROM user_documents WHERE user_id = $1', [userId]);
            const actualStorageUsed = Math.round((documentsResult.rows[0].total_size || 0) / 1024 / 1024);
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
    async checkStorageLimit(userId, additionalSize) {
        const storageInfo = await this.getStorageUsage(userId);
        const additionalMb = Math.ceil(additionalSize / 1024 / 1024);
        return storageInfo.available_mb >= additionalMb;
    }
    async getWorkspaceDashboard(userId) {
        const client = await database_1.default.connect();
        try {
            const notesCount = await this.notesService.getNotesCount(userId);
            const documentsResult = await client.query('SELECT COUNT(*) as count FROM user_documents WHERE user_id = $1', [userId]);
            const documentsCount = parseInt(documentsResult.rows[0].count);
            const recentNotes = await this.notesService.getRecentNotes(userId, 5);
            const recentDocumentsResult = await client.query('SELECT * FROM user_documents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]);
            const recentDocuments = recentDocumentsResult.rows;
            const storageInfo = await this.getStorageUsage(userId);
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
    async cleanupStorage(userId) {
        const client = await database_1.default.connect();
        try {
            const orphanedResult = await client.query(`SELECT id, file_size FROM user_documents 
         WHERE user_id = $1 AND (file_path IS NULL OR file_path = '')`, [userId]);
            let cleanedFiles = 0;
            let freedMb = 0;
            for (const doc of orphanedResult.rows) {
                await this.documentProcessor.deleteDocumentVectors(doc.id);
                await client.query('DELETE FROM user_documents WHERE id = $1', [doc.id]);
                cleanedFiles++;
                freedMb += Math.round((doc.file_size || 0) / 1024 / 1024);
            }
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
    async exportUserData(userId) {
        const client = await database_1.default.connect();
        try {
            const notesResult = await client.query('SELECT * FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
            const documentsResult = await client.query('SELECT id, title, description, original_name, file_size, mime_type, tags, created_at FROM user_documents WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
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
    async deleteUserData(userId) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            const documentsResult = await client.query('SELECT id FROM user_documents WHERE user_id = $1', [userId]);
            for (const doc of documentsResult.rows) {
                await this.documentProcessor.deleteDocumentVectors(doc.id);
            }
            await client.query('DELETE FROM user_notes WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM user_documents WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM user_workspace_settings WHERE user_id = $1', [userId]);
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
    async getUserDocuments(userId, filters) {
        const client = await database_1.default.connect();
        try {
            let query = 'SELECT * FROM user_documents WHERE user_id = $1';
            const values = [userId];
            let paramIndex = 2;
            if (filters?.tags && filters.tags.length > 0) {
                query += ` AND tags ?| $${paramIndex++}`;
                values.push(filters.tags);
            }
            if (filters?.is_processed !== undefined) {
                query += ` AND is_processed = $${paramIndex++}`;
                values.push(filters.is_processed);
            }
            if (filters?.is_ai_context_enabled !== undefined) {
                query += ` AND is_ai_context_enabled = $${paramIndex++}`;
                values.push(filters.is_ai_context_enabled);
            }
            query += ' ORDER BY created_at DESC';
            if (filters?.limit) {
                query += ` LIMIT $${paramIndex++}`;
                values.push(filters.limit);
            }
            if (filters?.offset) {
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
    async deleteDocument(documentId, userId) {
        const client = await database_1.default.connect();
        try {
            const docResult = await client.query('SELECT file_size FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            if (docResult.rows.length === 0) {
                throw new Error('Document not found');
            }
            const fileSize = docResult.rows[0].file_size;
            await this.documentProcessor.deleteDocumentVectors(documentId);
            await client.query('DELETE FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            if (fileSize) {
                await this.updateStorageUsage(userId, -fileSize);
            }
        }
        finally {
            client.release();
        }
    }
    async createDocument(userId, data) {
        const client = await database_1.default.connect();
        try {
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
    async searchWorkspaceContent(userId, query, type = 'all', limit = 20) {
        const client = await database_1.default.connect();
        try {
            const results = [];
            const searchTerm = `%${query.toLowerCase()}%`;
            if (type === 'all' || type === 'documents') {
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
                try {
                    const qdrantResults = await this.qdrantService.search(userId, query, Math.min(limit, 10));
                    if (qdrantResults.length > 0) {
                        const documentIds = qdrantResults.map(r => r.payload?.document_id).filter(Boolean);
                        if (documentIds.length > 0) {
                            const docMetadataQuery = `
                SELECT id, title, original_name, file_size, mime_type, created_at, tags
                FROM user_documents 
                WHERE user_id = $1 AND id = ANY($2::uuid[])
              `;
                            const metadataResult = await client.query(docMetadataQuery, [userId, documentIds]);
                            const metadataMap = new Map(metadataResult.rows.map(row => [row.id, row]));
                            qdrantResults.forEach(qdrantResult => {
                                if (qdrantResult.payload?.document_id) {
                                    const text = qdrantResult.payload?.text || qdrantResult.payload?.text_content_sample || '';
                                    if (text) {
                                        const metadata = metadataMap.get(qdrantResult.payload.document_id);
                                        if (metadata) {
                                            const existingIndex = results.findIndex(r => r.id === qdrantResult.payload?.document_id);
                                            if (existingIndex >= 0) {
                                                results[existingIndex].content = text;
                                                results[existingIndex].score = Math.max(results[existingIndex].score, qdrantResult.score || 0.5);
                                            }
                                            else {
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
                }
            }
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
            return results
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        }
        finally {
            client.release();
        }
    }
    truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength).trim() + '...';
    }
    async getTeamWorkspaceDocuments(userId) {
        const client = await database_1.default.connect();
        try {
            const teamMemberIds = await this.getTeamMemberIds(userId);
            if (teamMemberIds.length === 0) {
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
    async searchTeamWorkspaceContent(userId, query, type = 'all', filters, limit = 20) {
        const client = await database_1.default.connect();
        try {
            let searchUserIds = [userId];
            if (!filters?.scope || filters.scope !== 'own') {
                const teamMemberIds = await this.getTeamMemberIds(userId);
                if (teamMemberIds.length > 0) {
                    searchUserIds = filters?.scope === 'team'
                        ? teamMemberIds.filter(id => id !== userId)
                        : teamMemberIds;
                }
            }
            const results = [];
            const searchTerm = `%${query.toLowerCase()}%`;
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
            if ((type === 'all' || type === 'notes') && (!filters?.scope || filters.scope !== 'team')) {
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
                        uploader_name: null,
                        metadata: {
                            created_at: row.created_at,
                            tags: row.tags || []
                        }
                    });
                });
            }
            results.sort((a, b) => b.score - a.score);
            return results.slice(0, limit);
        }
        finally {
            client.release();
        }
    }
    async getTeamMemberIds(userId) {
        try {
            const teamId = await this.teamService.getUserTeamId(userId);
            if (!teamId) {
                return [userId];
            }
            return await this.teamService.getTeamMemberIds(teamId);
        }
        catch (error) {
            console.error('Error getting team member IDs:', error);
            return [userId];
        }
    }
    async getTeamWorkspaceDashboard(userId) {
        const client = await database_1.default.connect();
        try {
            const dashboard = await this.getWorkspaceDashboard(userId);
            const team = await this.teamService.getTeamByUserId(userId);
            if (!team) {
                return dashboard;
            }
            const isAdmin = await this.teamService.isTeamAdmin(userId, team.id);
            const teamMemberIds = await this.teamService.getTeamMemberIds(team.id);
            const teamDocumentsResult = await client.query('SELECT COUNT(*) as count FROM user_documents WHERE user_id = ANY($1::uuid[]) AND user_id != $2', [teamMemberIds, userId]);
            const teamDocumentsCount = parseInt(teamDocumentsResult.rows[0].count);
            const recentTeamDocsResult = await client.query(`SELECT ud.*, u.full_name as uploader_name
         FROM user_documents ud 
         JOIN users u ON ud.uploaded_by_user_id = u.id
         WHERE ud.user_id = ANY($1::uuid[]) AND ud.user_id != $2
         ORDER BY ud.created_at DESC 
         LIMIT 5`, [teamMemberIds, userId]);
            return {
                ...dashboard,
                team_info: {
                    name: team.name,
                    member_count: team.member_count,
                    is_admin: isAdmin
                },
                team_documents_count: teamDocumentsCount,
                team_recent_documents: recentTeamDocsResult.rows
            };
        }
        finally {
            client.release();
        }
    }
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