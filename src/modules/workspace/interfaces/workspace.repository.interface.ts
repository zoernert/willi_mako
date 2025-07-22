/**
 * Workspace Repository Interface
 * Definiert die Datenzugriffs-Operationen für Workspace-Funktionalität
 */

import {
  UserDocument,
  UserNote,
  UserWorkspaceSettings,
  UserDocumentChunk,
  DocumentUploadRequest,
  DocumentSearchQuery,
  DocumentSearchResult,
  NoteCreateRequest,
  NoteUpdateRequest,
  WorkspaceSettings
} from './workspace.interface';

export interface IWorkspaceRepository {
  // Document Operations
  createDocument(userId: string, request: DocumentUploadRequest): Promise<UserDocument>;
  getDocumentById(documentId: string, userId: string): Promise<UserDocument | null>;
  getDocumentsByUserId(userId: string): Promise<UserDocument[]>;
  searchDocuments(query: DocumentSearchQuery): Promise<DocumentSearchResult>;
  updateDocument(documentId: string, userId: string, updates: Partial<UserDocument>): Promise<UserDocument | null>;
  deleteDocument(documentId: string, userId: string): Promise<boolean>;
  
  // Document Chunk Operations
  createDocumentChunk(chunk: Omit<UserDocumentChunk, 'id'>): Promise<UserDocumentChunk>;
  getDocumentChunks(documentId: string): Promise<UserDocumentChunk[]>;
  deleteDocumentChunks(documentId: string): Promise<boolean>;
  
  // Note Operations
  createNote(userId: string, request: NoteCreateRequest): Promise<UserNote>;
  getNoteById(noteId: string, userId: string): Promise<UserNote | null>;
  getNotesByUserId(userId: string, limit?: number, offset?: number): Promise<UserNote[]>;
  updateNote(noteId: string, userId: string, updates: NoteUpdateRequest): Promise<UserNote | null>;
  deleteNote(noteId: string, userId: string): Promise<boolean>;
  searchNotes(userId: string, query: string, tags?: string[]): Promise<UserNote[]>;
  
  // Workspace Settings Operations
  getWorkspaceSettings(userId: string): Promise<UserWorkspaceSettings | null>;
  createWorkspaceSettings(userId: string, settings: WorkspaceSettings): Promise<UserWorkspaceSettings>;
  updateWorkspaceSettings(userId: string, settings: Partial<WorkspaceSettings>): Promise<UserWorkspaceSettings | null>;
  
  // Storage Management
  calculateStorageUsed(userId: string): Promise<number>;
  updateStorageUsed(userId: string, newUsage: number): Promise<boolean>;
  
  // Bulk Operations
  deleteUserWorkspace(userId: string): Promise<boolean>;
}
