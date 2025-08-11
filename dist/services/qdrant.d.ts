export interface QdrantPoint {
    id: string;
    vector: number[];
    payload: {
        text: string;
        metadata?: any;
        source?: string;
        timestamp?: string;
    };
}
export interface SearchResult {
    id: string;
    score: number;
    payload: {
        text: string;
        metadata?: any;
        source?: string;
        timestamp?: string;
    };
}
export declare class QdrantService {
    createCollection(vectorSize?: number): Promise<any>;
    insertPoints(points: QdrantPoint[]): Promise<any>;
    searchSimilar(queryVector: number[], limit?: number, scoreThreshold?: number): Promise<SearchResult[]>;
    searchByText(queryText: string, limit?: number, scoreThreshold?: number): Promise<SearchResult[]>;
    deletePoints(pointIds: string[]): Promise<any>;
    getCollection(): Promise<any>;
    updatePoint(pointId: string, point: Partial<QdrantPoint>): Promise<any>;
    testConnection(): Promise<void>;
}
declare const _default: QdrantService;
export default _default;
//# sourceMappingURL=qdrant.d.ts.map