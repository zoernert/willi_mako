import express from 'express';
import { NotesService } from '../services/notesService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const notesService = new NotesService();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/workspace/notes
 * Get user notes with optional filters
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const filters = {
      source_type: req.query.source_type as ('chat' | 'faq' | 'document' | 'manual' | undefined),
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const notes = await notesService.getUserNotes(userId, filters);
    
    // Return structured response for frontend compatibility
    return res.json({
      notes: notes || [],
      total: notes ? notes.length : 0
    });
    
  } catch (error) {
    console.error('Error getting notes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/workspace/notes
 * Create a new note
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { title, content, source_type, source_id, source_context, tags } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const noteData = {
      title,
      content,
      source_type,
      source_id,
      source_context,
      tags
    };
    
    const note = await notesService.createNote(userId, noteData);
    return res.status(201).json(note);
    
  } catch (error) {
    console.error('Error creating note:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/notes/search
 * Search notes using full-text search
 */
router.get('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await notesService.searchNotes(userId, query);
    return res.json(results);
    
  } catch (error) {
    console.error('Error searching notes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/notes/tags
 * Get all tags used by the user
 */
router.get('/tags', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const tags = await notesService.getUserTags(userId);
    return res.json(tags);
    
  } catch (error) {
    console.error('Error getting user tags:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/notes/by-source/:sourceType/:sourceId
 * Get notes by source type and ID
 */
router.get('/by-source/:sourceType/:sourceId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { sourceType, sourceId } = req.params;
    const notes = await notesService.getNotesBySource(userId, sourceType, sourceId);
    return res.json(notes);
    
  } catch (error) {
    console.error('Error getting notes by source:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/notes/:id
 * Get a specific note
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const noteId = req.params.id;
    const note = await notesService.getNoteById(noteId, userId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    return res.json(note);
    
  } catch (error) {
    console.error('Error getting note:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/workspace/notes/:id
 * Update a specific note
 */
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const noteId = req.params.id;
    const { title, content, tags } = req.body;
    
    const updateData = {
      title,
      content,
      tags
    };
    
    const note = await notesService.updateNote(noteId, userId, updateData);
    return res.json(note);
    
  } catch (error) {
    console.error('Error updating note:', error);
    if (error instanceof Error && error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/workspace/notes/:id
 * Delete a specific note
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const noteId = req.params.id;
    await notesService.deleteNote(noteId, userId);
    
    return res.json({ message: 'Note deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting note:', error);
    if (error instanceof Error && error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/workspace/notes/from-chat/:chatId/message/:messageId
 * Create note from chat message
 */
router.post('/from-chat/:chatId/message/:messageId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { chatId, messageId } = req.params;
    const { title, content, selectedText } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const noteData = {
      title: title || 'Note from Chat',
      content,
      source_type: 'chat' as const,
      source_id: chatId,
      source_context: selectedText || content.substring(0, 500)
    };
    
    const note = await notesService.createNote(userId, noteData);
    return res.status(201).json(note);
    
  } catch (error) {
    console.error('Error creating note from chat:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/workspace/notes/from-faq/:faqId
 * Create note from FAQ
 */
router.post('/from-faq/:faqId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { faqId } = req.params;
    const { title, content, selectedText } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const noteData = {
      title: title || 'Note from FAQ',
      content,
      source_type: 'faq' as const,
      source_id: faqId,
      source_context: selectedText || content.substring(0, 500)
    };
    
    const note = await notesService.createNote(userId, noteData);
    return res.status(201).json(note);
    
  } catch (error) {
    console.error('Error creating note from FAQ:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/workspace/notes/:id/tags
 * Update note tags
 */
router.put('/:id/tags', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const noteId = req.params.id;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }
    
    await notesService.updateNoteTags(noteId, userId, tags);
    return res.json({ message: 'Tags updated successfully' });
    
  } catch (error) {
    console.error('Error updating note tags:', error);
    if (error instanceof Error && error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/workspace/notes/bulk
 * Delete multiple notes
 */
router.delete('/bulk', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { noteIds } = req.body;
    
    if (!Array.isArray(noteIds) || noteIds.length === 0) {
      return res.status(400).json({ error: 'noteIds must be a non-empty array' });
    }
    
    const deletedCount = await notesService.deleteNotes(noteIds, userId);
    return res.json({ message: `${deletedCount} notes deleted successfully` });
    
  } catch (error) {
    console.error('Error deleting notes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
