"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notesService_1 = require("../services/notesService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const notesService = new notesService_1.NotesService();
// Apply authentication middleware to all routes
router.use(auth_1.authenticateToken);
/**
 * GET /api/workspace/notes
 * Get user notes with optional filters
 */
router.get('/', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Handle pagination: convert page to offset
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const offset = (page - 1) * limit;
        const filters = {
            source_type: req.query.source_type,
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            search: req.query.search,
            limit,
            offset
        };
        const result = await notesService.getUserNotesWithCount(userId, filters);
        // Return structured response for frontend compatibility
        return res.json({
            notes: result.notes || [],
            total: result.total || 0
        });
    }
    catch (error) {
        console.error('Error getting notes:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/workspace/notes
 * Create a new note
 */
router.post('/', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { title, content, source_type, source_id, source_context, tags, timelineId } = req.body;
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
        // Timeline-Integration (falls timelineId übergeben)
        if (timelineId) {
            try {
                const { TimelineActivityService } = await Promise.resolve().then(() => __importStar(require('../services/TimelineActivityService')));
                const { Pool } = await Promise.resolve().then(() => __importStar(require('pg')));
                const pool = new Pool({ connectionString: process.env.DATABASE_URL });
                const timelineService = new TimelineActivityService(pool);
                // Timeline-Aktivität erfassen
                await timelineService.captureActivity({
                    timelineId,
                    feature: 'notes',
                    activityType: 'note_created',
                    rawData: {
                        note_id: note.id,
                        title: note.title,
                        content: note.content,
                        source_type: note.source_type,
                        tags: note.tags,
                        created_at: note.created_at
                    },
                    priority: 4
                });
            }
            catch (timelineError) {
                console.warn('Timeline integration failed:', timelineError);
                // Don't fail the main request if timeline integration fails
            }
        }
        return res.status(201).json(note);
    }
    catch (error) {
        console.error('Error creating note:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/notes/search
 * Search notes using full-text search
 */
router.get('/search', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const results = await notesService.searchNotes(userId, query);
        return res.json(results);
    }
    catch (error) {
        console.error('Error searching notes:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/notes/tags
 * Get all tags used by the user
 */
router.get('/tags', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const tags = await notesService.getUserTags(userId);
        return res.json(tags);
    }
    catch (error) {
        console.error('Error getting user tags:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/notes/by-source/:sourceType/:sourceId
 * Get notes by source type and ID
 */
router.get('/by-source/:sourceType/:sourceId', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { sourceType, sourceId } = req.params;
        const notes = await notesService.getNotesBySource(userId, sourceType, sourceId);
        return res.json(notes);
    }
    catch (error) {
        console.error('Error getting notes by source:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/notes/:id
 * Get a specific note
 */
router.get('/:id', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const noteId = req.params.id;
        const note = await notesService.getNoteById(noteId, userId);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        return res.json(note);
    }
    catch (error) {
        console.error('Error getting note:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * PUT /api/workspace/notes/:id
 * Update a specific note
 */
router.put('/:id', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const noteId = req.params.id;
        const { title, content, tags, timelineId } = req.body;
        const updateData = {
            title,
            content,
            tags
        };
        const note = await notesService.updateNote(noteId, userId, updateData);
        // Timeline-Integration (falls timelineId übergeben)
        if (timelineId) {
            try {
                const { TimelineActivityService } = await Promise.resolve().then(() => __importStar(require('../services/TimelineActivityService')));
                const { Pool } = await Promise.resolve().then(() => __importStar(require('pg')));
                const pool = new Pool({ connectionString: process.env.DATABASE_URL });
                const timelineService = new TimelineActivityService(pool);
                // Timeline-Aktivität erfassen
                await timelineService.captureActivity({
                    timelineId,
                    feature: 'notes',
                    activityType: 'note_updated',
                    rawData: {
                        note_id: note.id,
                        title: note.title,
                        content: note.content,
                        tags: note.tags,
                        updated_at: note.updated_at
                    },
                    priority: 4
                });
            }
            catch (timelineError) {
                console.warn('Timeline integration failed:', timelineError);
                // Don't fail the main request if timeline integration fails
            }
        }
        return res.json(note);
    }
    catch (error) {
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
router.delete('/:id', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const noteId = req.params.id;
        await notesService.deleteNote(noteId, userId);
        return res.json({ message: 'Note deleted successfully' });
    }
    catch (error) {
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
router.post('/from-chat/:chatId/message/:messageId', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
            source_type: 'chat',
            source_id: chatId,
            source_context: selectedText || content.substring(0, 500)
        };
        const note = await notesService.createNote(userId, noteData);
        return res.status(201).json(note);
    }
    catch (error) {
        console.error('Error creating note from chat:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/workspace/notes/from-faq/:faqId
 * Create note from FAQ
 */
router.post('/from-faq/:faqId', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
            source_type: 'faq',
            source_id: faqId,
            source_context: selectedText || content.substring(0, 500)
        };
        const note = await notesService.createNote(userId, noteData);
        return res.status(201).json(note);
    }
    catch (error) {
        console.error('Error creating note from FAQ:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * PUT /api/workspace/notes/:id/tags
 * Update note tags
 */
router.put('/:id/tags', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
    }
    catch (error) {
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
router.delete('/bulk', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { noteIds } = req.body;
        if (!Array.isArray(noteIds) || noteIds.length === 0) {
            return res.status(400).json({ error: 'noteIds must be a non-empty array' });
        }
        const deletedCount = await notesService.deleteNotes(noteIds, userId);
        return res.json({ message: `${deletedCount} notes deleted successfully` });
    }
    catch (error) {
        console.error('Error deleting notes:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=notes.js.map