import { UserDocument } from '../types/workspace';
export declare class QdrantService {
    private client;
    private abbreviationIndex;
    private hybridSearchSupported;
    constructor();
    static createCollection(): Promise<void>;
    static searchByText(query: string, limit?: number, scoreThreshold?: number): Promise<{
        id: string | number;
        version: number;
        score: number;
        payload?: Record<string, unknown> | {
            [key: string]: unknown;
        } | null | undefined;
        vector?: Record<string, unknown> | number[] | number[][] | {
            [key: string]: number[] | number[][] | {
                indices: number[];
                values: number[];
            } | undefined;
        } | null | undefined;
        shard_key?: string | number | Record<string, unknown> | null | undefined;
        order_value?: number | Record<string, unknown> | null | undefined;
    }[]>;
    private static filterPseudocode;
    private static filterExcludeVisual;
    private static filterByPages;
    private static combineFilters;
    private static mergeWeighted;
    private static payloadBoost;
    private static outlineScopePages;
    static semanticSearchGuided(query: string, options?: {
        limit?: number;
        alpha?: number;
        outlineScoping?: boolean;
        excludeVisual?: boolean;
    }): Promise<any[]>;
    private ensureCollection;
    private ensureCs30Collection;
    upsertDocument(document: UserDocument, text: string): Promise<void>;
    deleteDocument(documentId: string): Promise<void>;
    search(userId: string, queryText: string, limit?: number): Promise<{
        id: string | number;
        version: number;
        score: number;
        payload?: Record<string, unknown> | {
            [key: string]: unknown;
        } | null | undefined;
        vector?: Record<string, unknown> | number[] | number[][] | {
            [key: string]: number[] | number[][] | {
                indices: number[];
                values: number[];
            } | undefined;
        } | null | undefined;
        shard_key?: string | number | Record<string, unknown> | null | undefined;
        order_value?: number | Record<string, unknown> | null | undefined;
    }[]>;
    searchByText(query: string, limit?: number, scoreThreshold?: number): Promise<{
        id: string | number;
        version: number;
        score: number;
        payload?: Record<string, unknown> | {
            [key: string]: unknown;
        } | null | undefined;
        vector?: Record<string, unknown> | number[] | number[][] | {
            [key: string]: number[] | number[][] | {
                indices: number[];
                values: number[];
            } | undefined;
        } | null | undefined;
        shard_key?: string | number | Record<string, unknown> | null | undefined;
        order_value?: number | Record<string, unknown> | null | undefined;
    }[]>;
    storeUserDocumentChunk(vectorId: string, text: string, documentId: string, userId: string, title: string, chunkIndex: number): Promise<void>;
    deleteVector(vectorId: string): Promise<void>;
    /**
     * Initialisiert den In-Memory-Index für Abkürzungen
     */
    private initializeAbbreviationIndex;
    /**
     * Analysiert die Nutzeranfrage und erstellt entsprechende Filter (DEPRECATED - use QueryAnalysisService)
     */
    private analyzeQueryForFilters;
    /**
     * Erweitert eine Anfrage mit gefundenen Abkürzungen (DEPRECATED - use QueryAnalysisService)
     */
    private expandQueryWithAbbreviations;
    /**
     * Ermittelt die aktuellsten Versionen aller Dokumente
     */
    private getLatestDocumentVersions;
    /**
     * Optimierte Suchfunktion mit Pre-Filtering und Query-Transformation
     */
    searchWithOptimizations(query: string, limit?: number, scoreThreshold?: number, useHyDE?: boolean): Promise<any[]>;
    storeFAQContent(faqId: string, title: string, description: string, context: string, answer: string, additionalInfo: string, tags: string[]): Promise<void>;
    updateFAQContent(faqId: string, title: string, description: string, context: string, answer: string, additionalInfo: string, tags: string[]): Promise<void>;
    deleteFAQContent(faqId: string): Promise<void>;
    searchFAQs(query: string, limit?: number, scoreThreshold?: number): Promise<{
        id: string | number;
        version: number;
        score: number;
        payload?: Record<string, unknown> | {
            [key: string]: unknown;
        } | null | undefined;
        vector?: Record<string, unknown> | number[] | number[][] | {
            [key: string]: number[] | number[][] | {
                indices: number[];
                values: number[];
            } | undefined;
        } | null | undefined;
        shard_key?: string | number | Record<string, unknown> | null | undefined;
        order_value?: number | Record<string, unknown> | null | undefined;
    }[]>;
    searchCs30(query: string, limit?: number, scoreThreshold?: number): Promise<any[]>;
    isCs30Available(): Promise<boolean>;
    searchWithHybrid(query: string, limit?: number, scoreThreshold?: number, alpha?: number, // Balances between vector and keyword search (0.0: only vector, 1.0: only keyword)
    userId?: string, // Optional user ID to filter by access control
    teamId?: string): Promise<{
        results: {
            id: string | number;
            version: number;
            score: number;
            payload?: Record<string, unknown> | {
                [key: string]: unknown;
            } | null | undefined;
            vector?: Record<string, unknown> | number[] | number[][] | {
                [key: string]: number[] | number[][] | {
                    indices: number[];
                    values: number[];
                } | undefined;
            } | null | undefined;
            shard_key?: string | number | Record<string, unknown> | null | undefined;
            order_value?: number | Record<string, unknown> | null | undefined;
        }[];
        hybridSearchUsed: boolean;
        hybridSearchAlpha: number;
    } | {
        results: {
            id: string | number;
            version: number;
            score: number;
            payload?: Record<string, unknown> | {
                [key: string]: unknown;
            } | null | undefined;
            vector?: Record<string, unknown> | number[] | number[][] | {
                [key: string]: number[] | number[][] | {
                    indices: number[];
                    values: number[];
                } | undefined;
            } | null | undefined;
            shard_key?: string | number | Record<string, unknown> | null | undefined;
            order_value?: number | Record<string, unknown> | null | undefined;
        }[];
        hybridSearchUsed: boolean;
        hybridSearchAlpha?: undefined;
    }>;
}
//# sourceMappingURL=qdrant.d.ts.map