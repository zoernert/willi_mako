import { Document, Note } from './workspace';

// Allowed source types as defined in database constraint
export type SourceType = 'chat' | 'faq' | 'document' | 'manual';

// Unified document type that combines notes and documents
export interface UnifiedDocument {
  id: string;
  title: string;
  content?: string; // For notes/markdown content
  description?: string;
  type: 'note' | 'file' | 'markdown'; // Type of document
  
  // Common properties
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  
  // File-specific properties (optional for notes)
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  original_name?: string;
  processed?: boolean;
  is_ai_context_enabled?: boolean;
  chunks_count?: number;
  
  // Note-specific properties (optional for files)
  source_type?: SourceType;
  source_id?: string;
  source_context?: string;
  workspace_id?: string;
  
  // UI state
  isEditing?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

// Helper functions to convert between types
export const noteToUnifiedDocument = (note: Note): UnifiedDocument => ({
  id: note.id,
  title: note.title,
  content: note.content,
  type: 'note',
  tags: note.tags || [],
  created_at: note.created_at,
  updated_at: note.updated_at,
  user_id: note.user_id,
  source_type: note.source_type as SourceType,
  source_id: note.source_id,
  source_context: note.source_context,
  workspace_id: note.workspace_id,
  can_edit: true,
  can_delete: true,
});

export const documentToUnifiedDocument = (document: Document): UnifiedDocument => ({
  id: document.id,
  title: document.title || document.name,
  description: document.description,
  type: 'file',
  tags: document.tags || [],
  created_at: document.created_at || document.uploaded_at,
  updated_at: document.updated_at || document.uploaded_at,
  user_id: document.user_id,
  file_path: document.file_path,
  file_size: document.file_size,
  mime_type: document.mime_type,
  original_name: document.original_name,
  processed: document.processed,
  is_ai_context_enabled: document.is_ai_context_enabled,
  chunks_count: document.chunks_count,
  can_edit: true,
  can_delete: true,
});

export const unifiedDocumentToNote = (doc: UnifiedDocument): Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'> => ({
  title: doc.title,
  content: doc.content || '',
  tags: doc.tags,
  source_type: doc.source_type,
  source_id: doc.source_id,
  source_context: doc.source_context,
  workspace_id: doc.workspace_id,
});

export const unifiedDocumentToDocument = (doc: UnifiedDocument): Partial<Document> => ({
  id: doc.id,
  name: doc.title,
  title: doc.title,
  description: doc.description,
  tags: doc.tags,
  is_ai_context_enabled: doc.is_ai_context_enabled,
});

// Filter and sort options for unified view
export interface UnifiedDocumentFilters {
  search?: string;
  type?: 'all' | 'note' | 'file' | 'markdown';
  tags?: string[];
  source_type?: SourceType;
  sortBy?: 'updated_at' | 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface UnifiedDocumentStats {
  totalDocuments: number;
  totalNotes: number;
  totalFiles: number;
  storageUsedMB: number;
  storageLimitMB: number;
  recentlyModified: number;
}
