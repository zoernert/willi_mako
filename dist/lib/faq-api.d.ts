export interface StaticFAQData {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    answer: string;
    additional_info?: string | null;
    tags: string[];
    view_count: number;
    created_at: string;
    updated_at: string;
    related_faqs: RelatedFAQ[];
}
export interface RelatedFAQ {
    id: string;
    title: string;
    slug: string;
    similarity_score?: number;
}
export interface FAQTag {
    tag: string;
    count: number;
}
export declare function generateFAQSlug(title: string): string;
export declare function slugifyTag(tag: string): string;
export declare function getAllPublicFAQs(): Promise<StaticFAQData[]>;
export declare function getFAQBySlug(slug: string): Promise<StaticFAQData | null>;
export declare function getRelatedFAQs(faqId: string, content: string, limit?: number): Promise<RelatedFAQ[]>;
export declare function getAllTags(): Promise<FAQTag[]>;
export declare function getFAQsByTag(tag: string): Promise<StaticFAQData[]>;
export declare function getLatestFAQs(limit?: number): Promise<StaticFAQData[]>;
export declare function getDistinctTags(): Promise<string[]>;
export declare function getAllFAQs(): Promise<StaticFAQData[]>;
//# sourceMappingURL=faq-api.d.ts.map