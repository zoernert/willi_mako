import { SemanticSearchOptions, SemanticSearchResponse } from '../../domain/api-v2/retrieval.types';
export declare class RetrievalService {
    semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResponse>;
    semanticSearchWilliNetz(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResponse>;
    semanticSearchCombined(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResponse>;
    private semanticSearchByCollection;
    private mapResults;
}
export declare const retrievalService: RetrievalService;
//# sourceMappingURL=retrieval.service.d.ts.map