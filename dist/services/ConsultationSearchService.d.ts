export type ContextHit = {
    text: string;
    source: string;
    score: number;
};
export declare class ConsultationSearchService {
    private client;
    constructor();
    search(slug: string, query: string, topK?: number): Promise<ContextHit[]>;
}
//# sourceMappingURL=ConsultationSearchService.d.ts.map