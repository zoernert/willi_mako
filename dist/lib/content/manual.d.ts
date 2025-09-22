export type ManualSection = {
    slug: string;
    title: string;
    level: number;
    content: string;
};
export declare function getManualMarkdown(): string;
export declare function parseManualSections(markdown?: string): ManualSection[];
export declare function getManualSectionBySlug(slug: string): ManualSection | null;
//# sourceMappingURL=manual.d.ts.map