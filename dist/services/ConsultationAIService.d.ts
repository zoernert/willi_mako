import { IssueRef } from './GithubIssuesService';
import { ConsultationPayload } from '../lib/content/consultations';
type SuggestParams = {
    role?: string;
    positionGeneral?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral';
    tone?: 'sachlich' | 'kurz' | 'detail';
    chapterKeys?: string[];
    selectedIssues?: IssueRef[];
};
export declare class ConsultationAIService {
    static summarizeChapters(payload: ConsultationPayload): Promise<Record<string, string>>;
    static suggestResponse(payload: ConsultationPayload, issues: IssueRef[], params: SuggestParams): Promise<{
        general: any;
        chapter9: any;
    }>;
}
export {};
//# sourceMappingURL=ConsultationAIService.d.ts.map