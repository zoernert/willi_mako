import { UserDocument, UserNote, UserWorkspaceSettings, UserDocumentChunk, DocumentUploadRequest, DocumentSearchQuery, DocumentSearchResult, NoteCreateRequest, NoteUpdateRequest, WorkspaceSettings } from './workspace.interface';
export interface IWorkspaceRepository {
    createDocument(userId: string, request: DocumentUploadRequest): Promise<UserDocument>;
    getDocumentById(documentId: string, userId: string): Promise<UserDocument | null>;
    getDocumentsByUserId(userId: string): Promise<UserDocument[]>;
    searchDocuments(query: DocumentSearchQuery): Promise<DocumentSearchResult>;
    updateDocument(documentId: string, userId: string, updates: Partial<UserDocument>): Promise<UserDocument | null>;
    deleteDocument(documentId: string, userId: string): Promise<boolean>;
    createDocumentChunk(chunk: Omit<UserDocumentChunk, 'id'>): Promise<UserDocumentChunk>;
    getDocumentChunks(documentId: string): Promise<UserDocumentChunk[]>;
    deleteDocumentChunks(documentId: string): Promise<boolean>;
    createNote(userId: string, request: NoteCreateRequest): Promise<UserNote>;
    getNoteById(noteId: string, userId: string): Promise<UserNote | null>;
    getNotesByUserId(userId: string, limit?: number, offset?: number): Promise<UserNote[]>;
    updateNote(noteId: string, userId: string, updates: NoteUpdateRequest): Promise<UserNote | null>;
    deleteNote(noteId: string, userId: string): Promise<boolean>;
    searchNotes(userId: string, query: string, tags?: string[]): Promise<UserNote[]>;
    getWorkspaceSettings(userId: string): Promise<UserWorkspaceSettings | null>;
    createWorkspaceSettings(userId: string, settings: WorkspaceSettings): Promise<UserWorkspaceSettings>;
    updateWorkspaceSettings(userId: string, settings: Partial<WorkspaceSettings>): Promise<UserWorkspaceSettings | null>;
    calculateStorageUsed(userId: string): Promise<number>;
    updateStorageUsed(userId: string, newUsage: number): Promise<boolean>;
    deleteUserWorkspace(userId: string): Promise<boolean>;
}
//# sourceMappingURL=workspace.repository.interface.d.ts.map