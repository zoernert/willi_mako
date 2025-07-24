// Workspace-related TypeScript types
export interface UserDocument {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  original_name: string;
  is_processed: boolean;
  is_ai_context_enabled: boolean;
  processing_error?: string | null;
  metadata: Record<string, any>;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface UserNote {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  source_type?: 'chat' | 'faq' | 'document' | 'manual';
  source_id?: string;
  source_context?: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface UserWorkspaceSettings {
  id: string;
  user_id: string;
  ai_context_enabled: boolean;
  auto_tag_enabled: boolean;
  storage_used_mb: number;
  storage_limit_mb: number;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UserDocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  vector_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

// Request/Response types
export interface CreateNoteData {
  title?: string;
  content: string;
  source_type?: 'chat' | 'faq' | 'document' | 'manual';
  source_id?: string;
  source_context?: string;
  tags?: string[];
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface CreateDocumentData {
  title: string;
  description?: string;
  file: Express.Multer.File;
  tags?: string[];
  is_ai_context_enabled?: boolean;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  tags?: string[];
  is_ai_context_enabled?: boolean;
}

export interface NoteFilters {
  source_type?: 'chat' | 'faq' | 'document' | 'manual';
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentFilters {
  tags?: string[];
  is_processed?: boolean;
  is_ai_context_enabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface StorageInfo {
  used_mb: number;
  limit_mb: number;
  available_mb: number;
  usage_percentage: number;
}

export interface WorkspaceDashboard {
  notes_count: number;
  documents_count: number;
  recent_notes: UserNote[];
  recent_documents: UserDocument[];
  storage_info: StorageInfo;
  ai_context_enabled: boolean;
}

// Search results
export interface SearchResult {
  type: 'note' | 'document';
  id: string;
  title: string;
  content_preview: string;
  relevance_score: number;
  tags: string[];
  created_at: Date;
}

export interface PersonalizedSearchResults {
  public_results: any[];
  user_results: SearchResult[];
  suggested_documents: UserDocument[];
  related_notes: UserNote[];
}

export interface ContextSuggestion {
  document_id: string;
  document_title: string;
  relevance_score: number;
  chunk_preview: string;
}

export interface AIContextRequest {
  query: string;
  include_user_documents?: boolean;
  include_user_notes?: boolean;
  document_ids?: string[];
  note_ids?: string[];
}
