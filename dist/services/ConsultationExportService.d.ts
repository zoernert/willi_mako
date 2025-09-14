import { ConsultationPayload } from '../lib/content/consultations';
import type { IssueRef } from './GithubIssuesService';
export type ResponseInput = {
    organization?: string;
    contact?: string;
    role?: string;
    positionGeneral?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral';
    remarksGeneral?: string;
    remarksChapter9?: string;
    selectedIssues?: IssueRef[];
};
export declare class ConsultationExportService {
    static exportPDF(payload: ConsultationPayload, issues?: IssueRef[]): Promise<Buffer>;
    static exportDOCX(payload: ConsultationPayload, issues?: IssueRef[]): Promise<Buffer>;
    static exportResponseDOCX(slug: string, input: ResponseInput): Promise<Buffer>;
    static renderHtml(payload: ConsultationPayload, issues?: IssueRef[]): string;
}
//# sourceMappingURL=ConsultationExportService.d.ts.map