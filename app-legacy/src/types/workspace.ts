export interface Document {
  id: string;
  name: string;
  title?: string; // For backward compatibility with components
  description?: string;
  original_name?: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  user_id: string;
  processed: boolean;
  is_processed?: boolean; // For backward compatibility
  is_ai_context_enabled?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  chunks_count?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  workspace_id?: string;
  source_type?: string;
  source_id?: string;
  source_context?: string;
}

export interface WorkspaceSettings {
  id: string;
  user_id: string;
  ai_context_enabled: boolean;
  auto_tag_enabled: boolean;
  storage_used_mb: number;
  storage_limit_mb: number;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  type: 'document' | 'note' | 'chat';
  id: string;
  title: string;
  content: string;
  snippet?: string;
  highlights?: string[];
  relevance_score: number;
  score?: number; // For backward compatibility
  created_at: string;
  // Team-specific fields
  is_own_document?: boolean;
  uploader_name?: string;
  uploader_email?: string;
  metadata?: {
    created_at?: string;
    tags?: string[];
    file_size?: number;
    mime_type?: string;
    [key: string]: any;
  };
}

export interface UploadResponse {
  document: Document;
  message: string;
}

export interface SearchRequest {
  query: string;
  type?: 'document' | 'note' | 'chat' | 'all';
  limit?: number;
  offset?: number;
}

export interface ContextResponse {
  relevant_documents: Document[];
  relevant_notes: Note[];
  suggestions: string[];
  context_summary: string;
}

export interface TeamDocument extends Document {
  is_own_document: boolean;
  uploader_name: string;
  uploader_email: string;
  uploaded_by_user_id: string;
  team_id?: string;
  can_edit?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
}

export interface TeamWorkspaceResponse {
  documents: TeamDocument[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters?: {
    scope: 'own' | 'team' | 'all';
    tags?: string[];
    mime_types?: string[];
    date_range?: {
      from: string;
      to: string;
    };
  };
}
