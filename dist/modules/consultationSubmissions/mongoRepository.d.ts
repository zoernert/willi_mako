import type { ConsultationSubmission, PublicSubmissionDTO, SubmissionStatus } from './interfaces';
export declare class ConsultationSubmissionsRepository {
    private db;
    private collection;
    private ensure;
    create(input: Omit<ConsultationSubmission, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'published'> & Partial<Pick<ConsultationSubmission, 'status' | 'published'>>): Promise<ConsultationSubmission>;
    getPublicBySlug(slug: string, limit?: number): Promise<PublicSubmissionDTO[]>;
    getPublicBySlugAndChapter(slug: string, chapterKey: string, limit?: number): Promise<PublicSubmissionDTO[]>;
    getPublicById(id: string): Promise<PublicSubmissionDTO | null>;
    listAll(slug: string, options?: {
        status?: SubmissionStatus | 'all';
        published?: boolean;
        chapterKey?: string;
        q?: string;
        limit?: number;
        offset?: number;
    }): Promise<ConsultationSubmission[]>;
    getById(id: string): Promise<ConsultationSubmission | null>;
    updateById(id: string, patch: Partial<Pick<ConsultationSubmission, 'status' | 'published' | 'curatedSummary' | 'curatedOpinion'>>): Promise<ConsultationSubmission | null>;
    deleteById(id: string): Promise<boolean>;
    private toPublicDTO;
}
//# sourceMappingURL=mongoRepository.d.ts.map