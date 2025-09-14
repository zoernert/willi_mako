export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export interface ConsultationSubmission {
    _id?: any;
    slug: string;
    chapterKey: string;
    author?: string;
    organization?: string;
    contact?: string;
    comment: string;
    createdAt: string;
    updatedAt: string;
    status: SubmissionStatus;
    published: boolean;
    curatedSummary?: string;
    curatedOpinion?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral' | null;
}
export interface PublicSubmissionDTO {
    id: string;
    slug: string;
    chapterKey: string;
    author?: string;
    organization?: string;
    comment: string;
    createdAt: string;
    curatedSummary?: string;
    curatedOpinion?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral' | null;
}
//# sourceMappingURL=interfaces.d.ts.map