import { CommunityVectorPoint } from '../types/community';
export declare class CommunityQdrantService {
    private collectionName;
    private client;
    constructor(collectionName?: string);
    /**
     * Ensure the community collection exists
     */
    private ensureCollection;
    /**
     * Upsert a vector point for community content
     */
    upsertVector(content: string, payload: CommunityVectorPoint): Promise<void>;
    /**
     * Search community content by text query
     */
    searchByText(query: string, limit?: number, scoreThreshold?: number): Promise<any[]>;
    /**
     * Delete all vectors for a specific thread
     */
    deleteThreadVectors(threadId: string): Promise<void>;
    /**
     * Delete specific section vectors
     */
    deleteSectionVectors(threadId: string, sectionKey: string, proposalId?: string): Promise<void>;
    /**
     * Search with filters
     */
    searchWithFilters(query: string, filters?: {
        thread_ids?: string[];
        section_keys?: string[];
        exclude_proposals?: boolean;
    }, limit?: number): Promise<any[]>;
    /**
     * Get collection info
     */
    getCollectionInfo(): Promise<any>;
}
//# sourceMappingURL=CommunityQdrantService.d.ts.map