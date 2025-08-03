export interface FAQ {
    id: string;
    title: string;
    content: string;
    category?: string;
    tags: string[];
    is_published: boolean;
    view_count: number;
    helpful_count: number;
    not_helpful_count: number;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export interface ChatSession {
    id: string;
    user_id: string;
    title?: string;
    status: 'active' | 'completed' | 'archived';
    context_enabled: boolean;
    message_count: number;
    created_at: Date;
    updated_at: Date;
    last_activity: Date;
}
export interface ChatMessage {
    id: string;
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, any>;
    token_count?: number;
    created_at: Date;
}
export interface DocumentProcessingJob {
    id: string;
    document_id: string;
    job_type: 'text_extraction' | 'vectorization' | 'ai_analysis';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress_percentage: number;
    result_data?: Record<string, any>;
    error_message?: string;
    started_at?: Date;
    completed_at?: Date;
    created_at: Date;
}
export interface FAQCreateRequest {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    is_published?: boolean;
}
export interface FAQUpdateRequest {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    is_published?: boolean;
}
export interface FAQSearchQuery {
    query?: string;
    category?: string;
    tags?: string[];
    is_published?: boolean;
    created_by?: string;
    limit?: number;
    offset?: number;
}
export interface FAQSearchResult {
    faqs: FAQ[];
    total_count: number;
    has_more: boolean;
}
export interface ChatSessionCreateRequest {
    title?: string;
    context_enabled?: boolean;
}
export interface ChatMessageCreateRequest {
    content: string;
    role: 'user' | 'assistant';
    metadata?: Record<string, any>;
}
export interface ChatSearchQuery {
    user_id: string;
    query?: string;
    status?: 'active' | 'completed' | 'archived';
    date_from?: Date;
    date_to?: Date;
    limit?: number;
    offset?: number;
}
export interface DocumentProcessingRequest {
    document_id: string;
    job_type: 'text_extraction' | 'vectorization' | 'ai_analysis';
    options?: Record<string, any>;
}
export interface DocumentAnalysisResult {
    summary: string;
    key_topics: string[];
    suggested_tags: string[];
    readability_score?: number;
    language?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
}
//# sourceMappingURL=documents.interface.d.ts.map