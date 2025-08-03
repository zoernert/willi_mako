import { UserNote, CreateNoteData, UpdateNoteData, NoteFilters, SearchResult } from '../types/workspace';
export declare class NotesService {
    private geminiService;
    constructor();
    createNote(userId: string, data: CreateNoteData): Promise<UserNote>;
    updateNote(noteId: string, userId: string, data: UpdateNoteData): Promise<UserNote>;
    deleteNote(noteId: string, userId: string): Promise<void>;
    getUserNotes(userId: string, filters?: NoteFilters): Promise<UserNote[]>;
    getUserNotesWithCount(userId: string, filters?: NoteFilters): Promise<{
        notes: UserNote[];
        total: number;
    }>;
    searchNotes(userId: string, query: string): Promise<SearchResult[]>;
    linkNoteToSource(noteId: string, sourceType: string, sourceId: string, sourceContext?: string): Promise<void>;
    getNoteById(noteId: string, userId: string): Promise<UserNote | null>;
    getNotesBySource(userId: string, sourceType: string, sourceId: string): Promise<UserNote[]>;
    getRecentNotes(userId: string, limit?: number): Promise<UserNote[]>;
    getNotesCount(userId: string): Promise<number>;
    getUserTags(userId: string): Promise<string[]>;
    private generateTags;
    private getUserSettings;
    updateNoteTags(noteId: string, userId: string, tags: string[]): Promise<void>;
    deleteNotes(noteIds: string[], userId: string): Promise<number>;
}
//# sourceMappingURL=notesService.d.ts.map