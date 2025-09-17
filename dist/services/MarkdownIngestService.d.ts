export type MarkdownIngestType = 'glossary' | 'abbreviation' | 'guide' | 'note';
export interface MarkdownIngestRequest {
    title: string;
    slug?: string;
    content: string;
    type?: MarkdownIngestType;
    tags?: string[];
    createdByUserId?: string;
}
export declare class MarkdownIngestService {
    private client;
    constructor();
    /**
     * Upserts markdown content into Qdrant by chunking it and creating vectors.
     * Returns number of chunks and ids used.
     */
    upsertMarkdown(req: MarkdownIngestRequest): Promise<{
        chunks: number;
        ids: Array<string | number>;
        slug: string;
    }>;
    /** Delete all vectors for a given markdown slug */
    deleteBySlug(slug: string): Promise<{
        deleted: boolean;
    }>;
    /** Search only within admin_markdown content */
    search(query: string, limit?: number): Promise<any[]>;
    private slugify;
    private extractAbbreviations;
    private chunkMarkdown;
}
declare const _default: MarkdownIngestService;
export default _default;
//# sourceMappingURL=MarkdownIngestService.d.ts.map