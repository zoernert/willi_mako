/**
 * Workspace Service Interface
 * Definiert die Business-Logic-Operationen für Workspace-Funktionalität
 */
import { UserDocument, UserNote, UserWorkspaceSettings, DocumentUploadRequest, DocumentSearchQuery, DocumentSearchResult, NoteCreateRequest, NoteUpdateRequest, WorkspaceSettings } from './workspace.interface';
export interface IWorkspaceService {
    uploadDocument(userId: string, request: DocumentUploadRequest): Promise<UserDocument>;
    getDocument(documentId: string, userId: string): Promise<UserDocument>;
    searchDocuments(query: DocumentSearchQuery): Promise<DocumentSearchResult>;
    updateDocument(documentId: string, userId: string, updates: Partial<UserDocument>): Promise<UserDocument>;
    deleteDocument(documentId: string, userId: string): Promise<void>;
    processDocument(documentId: string): Promise<void>;
    createNote(userId: string, request: NoteCreateRequest): Promise<UserNote>;
    getNote(noteId: string, userId: string): Promise<UserNote>;
    getUserNotes(userId: string, limit?: number, offset?: number): Promise<UserNote[]>;
    updateNote(noteId: string, userId: string, updates: NoteUpdateRequest): Promise<UserNote>;
    deleteNote(noteId: string, userId: string): Promise<void>;
    searchNotes(userId: string, query: string, tags?: string[]): Promise<UserNote[]>;
    enableAIContext(documentId: string, userId: string): Promise<void>;
    disableAIContext(documentId: string, userId: string): Promise<void>;
    getAIContext(userId: string): Promise<string[]>;
    getWorkspaceSettings(userId: string): Promise<UserWorkspaceSettings>;
    updateWorkspaceSettings(userId: string, settings: Partial<WorkspaceSettings>): Promise<UserWorkspaceSettings>;
    getStorageInfo(userId: string): Promise<{
        used: number;
        limit: number;
        percentage: number;
    }>;
    checkStorageLimit(userId: string, additionalSize: number): Promise<boolean>;
    addTagsToDocument(documentId: string, userId: string, tags: string[]): Promise<void>;
    removeTagsFromDocument(documentId: string, userId: string, tags: string[]): Promise<void>;
    getUserTags(userId: string): Promise<string[]>;
    deleteUserWorkspace(userId: string): Promise<void>;
}
//# sourceMappingURL=workspace.service.interface.d.ts.map