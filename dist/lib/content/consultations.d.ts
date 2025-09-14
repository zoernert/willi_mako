export interface ConsultationSection {
    key: string;
    title: string;
    markdown: string;
    html: string;
}
export interface ConsultationPayload {
    slug: string;
    title: string;
    status: 'draft' | 'published' | 'final';
    updated_at: string;
    tags: string[];
    executiveSummary?: string;
    sections: ConsultationSection[];
    downloads?: {
        pdf?: string;
        docx?: string;
    };
}
export declare function parseConsultationMarkdown(filePath: string, slug: string, opts?: {
    title?: string;
    tags?: string[];
}): ConsultationPayload | null;
export declare function getConsultationBySlug(slug: string): ConsultationPayload | null;
//# sourceMappingURL=consultations.d.ts.map