export type ArticleFrontmatter = {
    title: string;
    slug?: string;
    shortDescription?: string;
    excerpt?: string;
    whitepaperSlug?: string;
    date?: string;
    publishedDate?: string;
    modifiedDate?: string;
    status?: 'draft' | 'published';
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
};
export type Article = Required<Omit<ArticleFrontmatter, 'seoTitle' | 'seoDescription' | 'canonicalUrl' | 'modifiedDate' | 'tags'>> & {
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    modifiedDate?: string;
    tags: string[];
    content: string;
};
export declare function getArticleSlugs(): string[];
export declare function getArticleBySlug(slug: string): Article | null;
export declare function getAllArticles(): Article[];
export declare function getArticlesByWhitepaperSlug(whitepaperSlug: string): Article[];
//# sourceMappingURL=articles.d.ts.map