import { Pool } from 'pg';
import { CommunityThread, DocumentComment, ThreadSummary, CreateThreadRequest, PatchOperation, CommunityInitiative, CreateInitiativeRequest, UpdateInitiativeRequest, InitiativeStatus } from '../types/community';
export declare class CommunityRepository {
    private db;
    constructor(db: Pool);
    /**
     * Create a new community thread
     */
    createThread(request: CreateThreadRequest, userId: string): Promise<CommunityThread>;
    /**
     * Get thread by ID
     */
    getThreadById(id: string): Promise<CommunityThread | null>;
    /**
     * List threads with filtering and pagination
     */
    listThreads(page?: number, limit?: number, filters?: {
        status?: string;
        tags?: string[];
        search?: string;
    }): Promise<{
        threads: ThreadSummary[];
        total: number;
    }>;
    /**
     * Update thread document using JSON patch operations
     */
    updateDocument(threadId: string, operations: PatchOperation[], userId: string, version?: string): Promise<{
        thread: CommunityThread;
        changed: string[];
    }>;
    /**
     * Update thread status
     */
    updateStatus(threadId: string, status: string, userId: string): Promise<CommunityThread>;
    /**
     * Create a comment on a thread section
     */
    createComment(threadId: string, blockId: string, content: string, userId: string): Promise<DocumentComment>;
    /**
     * Get comments for a thread
     */
    getCommentsForThread(threadId: string): Promise<DocumentComment[]>;
    /**
     * Delete a thread (admin only)
     */
    deleteThread(threadId: string): Promise<boolean>;
    /**
     * Create a new community initiative from a finalized thread
     */
    createInitiative(threadId: string, request: CreateInitiativeRequest, draftContent: string, userId: string): Promise<CommunityInitiative>;
    /**
     * Get initiative by ID
     */
    getInitiativeById(id: string): Promise<CommunityInitiative | null>;
    /**
     * Get initiative by thread ID
     */
    getInitiativeByThreadId(threadId: string): Promise<CommunityInitiative | null>;
    /**
     * Update initiative
     */
    updateInitiative(id: string, updates: Partial<UpdateInitiativeRequest>): Promise<CommunityInitiative | null>;
    /**
     * Update initiative status
     */
    updateInitiativeStatus(id: string, status: InitiativeStatus, submissionDetails?: Record<string, any>): Promise<CommunityInitiative | null>;
    /**
     * List initiatives with filtering
     */
    listInitiatives(page?: number, limit?: number, filters?: {
        status?: InitiativeStatus;
        userId?: string;
    }): Promise<{
        initiatives: CommunityInitiative[];
        total: number;
    }>;
    /**
     * Delete initiative
     */
    deleteInitiative(id: string): Promise<boolean>;
    /**
     * Log audit entry
     */
    private logAuditEntry;
    /**
     * Map database row to CommunityThread
     */
    private mapRowToThread;
    /**
     * Map database row to ThreadSummary
     */
    private mapRowToThreadSummary;
    /**
     * Map database row to DocumentComment
     */
    private mapRowToComment;
    /**
     * Map database row to CommunityInitiative
     */
    private mapRowToInitiative;
}
//# sourceMappingURL=CommunityRepository.d.ts.map