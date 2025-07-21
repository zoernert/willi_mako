import pool from '../config/database';
import { UserNote, CreateNoteData, UpdateNoteData, NoteFilters, SearchResult } from '../types/workspace';
import { GeminiService } from './gemini';

export class NotesService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Create a new note
   */
  async createNote(userId: string, data: CreateNoteData): Promise<UserNote> {
    const client = await pool.connect();
    
    try {
      // Generate tags if auto-tagging is enabled
      let tags = data.tags || [];
      if (tags.length === 0) {
        const userSettings = await this.getUserSettings(userId);
        if (userSettings.auto_tag_enabled) {
          tags = await this.generateTags(data.content, data.title);
        }
      }
      
      const result = await client.query(`
        INSERT INTO user_notes 
        (user_id, title, content, source_type, source_id, source_context, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userId,
        data.title,
        data.content,
        data.source_type,
        data.source_id,
        data.source_context,
        JSON.stringify(tags)
      ]);
      
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(noteId: string, userId: string, data: UpdateNoteData): Promise<UserNote> {
    const client = await pool.connect();
    
    try {
      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(data.title);
      }
      
      if (data.content !== undefined) {
        updateFields.push(`content = $${paramIndex++}`);
        values.push(data.content);
      }
      
      if (data.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(data.tags));
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(noteId, userId);
      
      const query = `
        UPDATE user_notes 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Note not found');
      }
      
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM user_notes WHERE id = $1 AND user_id = $2',
        [noteId, userId]
      );
      
      if (result.rowCount === 0) {
        throw new Error('Note not found');
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Get user notes with filters
   */
  async getUserNotes(userId: string, filters?: NoteFilters): Promise<UserNote[]> {
    const client = await pool.connect();
    
    try {
      let query = 'SELECT * FROM user_notes WHERE user_id = $1';
      const values: any[] = [userId];
      let paramIndex = 2;
      
      // Apply filters
      if (filters?.source_type) {
        query += ` AND source_type = $${paramIndex++}`;
        values.push(filters.source_type);
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        query += ` AND tags ?| $${paramIndex++}`;
        values.push(filters.tags);
      }
      
      if (filters?.search) {
        query += ` AND (title ILIKE $${paramIndex++} OR content ILIKE $${paramIndex++})`;
        values.push(`%${filters.search}%`, `%${filters.search}%`);
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
      
    } finally {
      client.release();
    }
  }

  /**
   * Search notes using full-text search
   */
  async searchNotes(userId: string, query: string): Promise<SearchResult[]> {
    const client = await pool.connect();
    
    try {
      const searchQuery = `
        SELECT 
          id,
          title,
          content,
          tags,
          created_at,
          ts_rank(to_tsvector('english', coalesce(title, '') || ' ' || content), plainto_tsquery('english', $2)) as relevance_score
        FROM user_notes 
        WHERE user_id = $1 
        AND (
          to_tsvector('english', coalesce(title, '') || ' ' || content) @@ plainto_tsquery('english', $2)
          OR title ILIKE $3 
          OR content ILIKE $3
        )
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT 20
      `;
      
      const result = await client.query(searchQuery, [userId, query, `%${query}%`]);
      
      return result.rows.map(row => ({
        type: 'note' as const,
        id: row.id,
        title: row.title || 'Untitled Note',
        content_preview: row.content.substring(0, 200) + (row.content.length > 200 ? '...' : ''),
        relevance_score: parseFloat(row.relevance_score || '0'),
        tags: row.tags || [],
        created_at: row.created_at
      }));
      
    } finally {
      client.release();
    }
  }

  /**
   * Link note to a source (chat, FAQ, document)
   */
  async linkNoteToSource(noteId: string, sourceType: string, sourceId: string, sourceContext?: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE user_notes SET source_type = $1, source_id = $2, source_context = $3 WHERE id = $4',
        [sourceType, sourceId, sourceContext, noteId]
      );
      
      if (result.rowCount === 0) {
        throw new Error('Note not found');
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Get note by ID
   */
  async getNoteById(noteId: string, userId: string): Promise<UserNote | null> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM user_notes WHERE id = $1 AND user_id = $2',
        [noteId, userId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  /**
   * Get notes by source
   */
  async getNotesBySource(userId: string, sourceType: string, sourceId: string): Promise<UserNote[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM user_notes WHERE user_id = $1 AND source_type = $2 AND source_id = $3 ORDER BY created_at DESC',
        [userId, sourceType, sourceId]
      );
      
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  /**
   * Get recent notes for dashboard
   */
  async getRecentNotes(userId: string, limit: number = 5): Promise<UserNote[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  /**
   * Get notes count for user
   */
  async getNotesCount(userId: string): Promise<number> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM user_notes WHERE user_id = $1',
        [userId]
      );
      
      return parseInt(result.rows[0].count);
      
    } finally {
      client.release();
    }
  }

  /**
   * Get all tags used by user
   */
  async getUserTags(userId: string): Promise<string[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT DISTINCT jsonb_array_elements_text(tags) as tag
        FROM user_notes 
        WHERE user_id = $1 AND tags != '[]'
        ORDER BY tag
      `, [userId]);
      
      return result.rows.map(row => row.tag);
      
    } finally {
      client.release();
    }
  }

  /**
   * Generate tags for content using AI
   */
  private async generateTags(content: string, title?: string): Promise<string[]> {
    try {
      const text = title ? `${title}\n\n${content}` : content;
      const tags = await this.geminiService.generateTagsForNote(text);
      return tags;
    } catch (error) {
      console.error('Error generating tags:', error);
      return [];
    }
  }

  /**
   * Get user workspace settings
   */
  private async getUserSettings(userId: string): Promise<{ auto_tag_enabled: boolean }> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT auto_tag_enabled FROM user_workspace_settings WHERE user_id = $1',
        [userId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : { auto_tag_enabled: false };
      
    } finally {
      client.release();
    }
  }

  /**
   * Update note tags
   */
  async updateNoteTags(noteId: string, userId: string, tags: string[]): Promise<void> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE user_notes SET tags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
        [JSON.stringify(tags), noteId, userId]
      );
      
      if (result.rowCount === 0) {
        throw new Error('Note not found');
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Bulk delete notes
   */
  async deleteNotes(noteIds: string[], userId: string): Promise<number> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM user_notes WHERE id = ANY($1) AND user_id = $2',
        [noteIds, userId]
      );
      
      return result.rowCount || 0;
      
    } finally {
      client.release();
    }
  }
}
