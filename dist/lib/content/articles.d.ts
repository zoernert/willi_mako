export type ArticleFrontmatter = {
    title: string;
    slug?: string;
    shortDescription?: string;
    whitepaperSlug?: string;
    publishedDate?: string;
    status?: 'draft' | 'published';
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
};
export type Article = Required<Omit<ArticleFrontmatter, 'seoTitle' | 'seoDescription' | 'canonicalUrl'>> & {
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    content: string;
};
export declare function getArticleSlugs(): string[];
export declare function getArticleBySlug(slug: string): Article | null;
export declare function getAllArticles(): Article[];
export declare function getArticlesByWhitepaperSlug(whitepaperSlug: string): Article[];
//# sourceMappingURL=articles.d.ts.map