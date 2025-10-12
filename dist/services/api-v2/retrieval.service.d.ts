import { SemanticSearchOptions, SemanticSearchResponse } from '../../domain/api-v2/retrieval.types';
export declare class RetrievalService {
    semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResponse>;
}
export declare const retrievalService: RetrievalService;
//# sourceMappingURL=retrieval.service.d.ts.map