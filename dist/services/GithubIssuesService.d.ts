export interface IssueRef {
    number: number;
    title: string;
    labels: string[];
    url: string;
    state: 'open' | 'closed';
    updated_at: string;
    chapterKey?: string | null;
}
export declare class GithubIssuesService {
    /** Resolve the GitHub repo for a consultation slug */
    static resolveRepoForSlug(slug?: string): string;
    /** Create a GitHub issue in the repo tied to the consultation slug */
    static createIssueForConsultation(slug: string, title: string, body: string, labels?: string[]): Promise<{
        url: string;
        number: number;
    }>;
    static getIssues(forceRefresh?: boolean, slug?: string): Promise<IssueRef[]>;
    static getIssuesByChapter(chapterKey: string, slug?: string): Promise<IssueRef[]>;
}
//# sourceMappingURL=GithubIssuesService.d.ts.map