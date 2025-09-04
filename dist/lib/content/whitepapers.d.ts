export type WhitepaperFrontmatter = {
    title: string;
    slug: string;
    description: string;
    publishedDate: string;
    pdfPath: string;
    status?: 'draft' | 'published';
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
};
export type Whitepaper = WhitepaperFrontmatter & {
    content: string;
};
export declare function getWhitepaperSlugs(): string[];
export declare function getWhitepaperBySlug(slug: string): Whitepaper | null;
export declare function getAllWhitepapers(): Whitepaper[];
//# sourceMappingURL=whitepapers.d.ts.map