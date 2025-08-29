import { UserNote, CreateNoteData, UpdateNoteData, NoteFilters, SearchResult } from '../types/workspace';
export declare class NotesService {
    constructor();
    /**
     * Create a new note
     */
    createNote(userId: string, data: CreateNoteData): Promise<UserNote>;
    /**
     * Update an existing note
     */
    updateNote(noteId: string, userId: string, data: UpdateNoteData): Promise<UserNote>;
    /**
     * Delete a note
     */
    deleteNote(noteId: string, userId: string): Promise<void>;
    /**
     * Get user notes with filters
     */
    getUserNotes(userId: string, filters?: NoteFilters): Promise<UserNote[]>;
    /**
     * Get user notes with filters and total count for pagination
     */
    getUserNotesWithCount(userId: string, filters?: NoteFilters): Promise<{
        notes: UserNote[];
        total: number;
    }>;
    /**
     * Search notes using full-text search
     */
    searchNotes(userId: string, query: string): Promise<SearchResult[]>;
    /**
     * Link note to a source (chat, FAQ, document)
     */
    linkNoteToSource(noteId: string, sourceType: string, sourceId: string, sourceContext?: string): Promise<void>;
    /**
     * Get note by ID
     */
    getNoteById(noteId: string, userId: string): Promise<UserNote | null>;
    /**
     * Get notes by source
     */
    getNotesBySource(userId: string, sourceType: string, sourceId: string): Promise<UserNote[]>;
    /**
     * Get recent notes for dashboard
     */
    getRecentNotes(userId: string, limit?: number): Promise<UserNote[]>;
    /**
     * Get notes count for user
     */
    getNotesCount(userId: string): Promise<number>;
    /**
     * Get all tags used by user
     */
    getUserTags(userId: string): Promise<string[]>;
    /**
     * Generate tags for content using AI
     */
    private generateTags;
    /**
     * Get user workspace settings
     */
    private getUserSettings;
    /**
     * Update note tags
     */
    updateNoteTags(noteId: string, userId: string, tags: string[]): Promise<void>;
    /**
     * Bulk delete notes
     */
    deleteNotes(noteIds: string[], userId: string): Promise<number>;
}
//# sourceMappingURL=notesService.d.ts.map