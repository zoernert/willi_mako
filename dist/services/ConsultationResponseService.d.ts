import { IssueRef } from './GithubIssuesService';
export type ResponseInput = {
    organization?: string;
    contact?: string;
    role?: string;
    positionGeneral?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral';
    remarksGeneral?: string;
    remarksChapter9?: string;
    selectedIssues?: IssueRef[];
};
export declare class ConsultationResponseService {
    static buildDOCX(slug: string, input: ResponseInput): Promise<Buffer>;
}
//# sourceMappingURL=ConsultationResponseService.d.ts.map