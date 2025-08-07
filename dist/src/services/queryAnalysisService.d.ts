/**
 * Service für intelligente Query-Analyse und Dokumentenfilterung
 */
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
    /**
     * Analysiert eine Nutzeranfrage und extrahiert Filterkriterien
     */
    static analyzeQuery(query: string, abbreviationIndex?: Map<string, string>): QueryAnalysisResult;
    /**
     * Erstellt Qdrant-Filter basierend auf Analyse-Ergebnissen
     */
    static createQdrantFilter(analysisResult: QueryAnalysisResult, latestDocumentVersions?: string[]): any;
    /**
     * Erstellt eine Zusammenfassung der angewendeten Filter für Logging
     */
    static createFilterSummary(analysisResult: QueryAnalysisResult): string;
}
//# sourceMappingURL=queryAnalysisService.d.ts.map