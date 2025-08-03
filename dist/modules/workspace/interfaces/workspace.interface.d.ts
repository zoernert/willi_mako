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
}
export interface DocumentUploadRequest {
    title: string;
    description?: string;
    file: Express.Multer.File;
    tags?: string[];
    is_ai_context_enabled?: boolean;
}
export interface DocumentSearchQuery {
    user_id: string;
    query?: string;
    tags?: string[];
    mime_types?: string[];
    date_from?: Date;
    date_to?: Date;
    limit?: number;
    offset?: number;
}
export interface DocumentSearchResult {
    documents: UserDocument[];
    total_count: number;
    has_more: boolean;
}
export interface NoteCreateRequest {
    title?: string;
    content: string;
    source_type?: 'chat' | 'faq' | 'document' | 'manual';
    source_id?: string;
    source_context?: string;
    tags?: string[];
}
export interface NoteUpdateRequest {
    title?: string;
    content?: string;
    tags?: string[];
}
export interface WorkspaceSettings {
    ai_context_enabled: boolean;
    auto_tag_enabled: boolean;
    storage_limit_mb: number;
    [key: string]: any;
}
//# sourceMappingURL=workspace.interface.d.ts.map