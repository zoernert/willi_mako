export interface QueryAnalysisResult {
    intentType: 'definition' | 'table_data' | 'document_specific' | 'general';
    documentReference?: string;
    filterCriteria: {
        chunkTypes?: string[];
        documentBaseName?: string;
        temporal?: {
            requireLatest: boolean;
            specificVersion?: string;
        };
    };
    expandedQuery: string;
    confidence: number;
}
export declare class QueryAnalysisService {
    private static readonly DOCUMENT_MAPPINGS;
    private static readonly DEFINITION_PATTERNS;
    private static readonly TABLE_PATTERNS;
    static analyzeQuery(query: string, abbreviationIndex?: Map<string, string>): QueryAnalysisResult;
    static createQdrantFilter(analysisResult: QueryAnalysisResult, latestDocumentVersions?: string[]): any;
    static createFilterSummary(analysisResult: QueryAnalysisResult): string;
}
//# sourceMappingURL=queryAnalysisService.d.ts.map