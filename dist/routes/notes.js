"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notesService_1 = require("../services/notesService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const notesService = new notesService_1.NotesService();
router.use(auth_1.authenticateToken);
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
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
router.post('/', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error creating note:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/search', async (req, res) => {
    try {
        const userId = req.user?.id;
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
router.get('/tags', async (req, res) => {
    try {
        const userId = req.user?.id;
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
router.get('/by-source/:sourceType/:sourceId', async (req, res) => {
    try {
        const userId = req.user?.id;
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
router.get('/:id', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error getting note:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:id', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error updating note:', error);
        if (error instanceof Error && error.message === 'Note not found') {
            return res.status(404).json({ error: 'Note not found' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
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
router.post('/from-chat/:chatId/message/:messageId', async (req, res) => {
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
router.post('/from-faq/:faqId', async (req, res) => {
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
router.put('/:id/tags', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error updating note tags:', error);
        if (error instanceof Error && error.message === 'Note not found') {
            return res.status(404).json({ error: 'Note not found' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/bulk', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error deleting notes:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=notes.js.map