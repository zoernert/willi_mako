export interface FAQ {
    id: string;
    title: string;
    description: string;
    context: string;
    answer: string;
    additional_info?: string;
    tags: string[];
    view_count: number;
    is_active: boolean;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    source_chat_id?: string;
    source_message_id?: string;
    created_by?: string;
}
export interface FAQLink {
    id: string;
    source_faq_id: string;
    target_faq_id: string;
    term: string;
    display_text?: string;
    is_automatic: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}
export interface LinkedTerm {
    term: string;
    target_faq_id: string;
    display_text?: string;
    link_id?: string;
}
export interface FAQWithLinks extends FAQ {
    linked_terms?: LinkedTerm[];
}
export interface CreateFAQLinkRequest {
    source_faq_id: string;
    target_faq_id: string;
    term: string;
    display_text?: string;
    is_automatic?: boolean;
}
export interface FAQLinkingStats {
    total_links: number;
    automatic_links: number;
    manual_links: number;
    most_linked_faq: {
        id: string;
        title: string;
        link_count: number;
    };
}
//# sourceMappingURL=faq.d.ts.map