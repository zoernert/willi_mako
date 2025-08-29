import { CommunityVectorPoint } from '../types/community';
export declare class CommunityQdrantService {
    private client;
    private collectionName;
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
    /**
     * Batch update multiple sections of a thread
     */
    batchUpsertSections(threadId: string, sections: Array<{
        section_key: string;
        content: string;
        proposal_id?: string;
    }>): Promise<void>;
    /**
     * Delete specific proposal vector
     */
    deleteProposalVector(threadId: string, proposalId: string): Promise<void>;
    /**
     * Get collection stats for monitoring
     */
    getCollectionStats(): Promise<any>;
}
//# sourceMappingURL=CommunityQdrantService.d.ts.map