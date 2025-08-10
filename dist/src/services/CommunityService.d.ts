import { Pool } from 'pg';
import { CommunityQdrantService } from './CommunityQdrantService';
import { CommunityThread, DocumentComment, ThreadSummary, CreateThreadRequest, UpdateDocumentRequest, ThreadStatus, CommunityInitiative, CreateInitiativeRequest, UpdateInitiativeRequest, InitiativeStatus } from '../types/community';
export declare class CommunityService {
    private db;
    private repository;
    private qdrantService;
    private config;
    constructor(db: Pool, qdrantService?: CommunityQdrantService);
    /**
     * Create a new community thread
     */
    createThread(request: CreateThreadRequest, userId: string): Promise<CommunityThread>;
    /**
     * Get thread by ID with access control
     */
    getThread(threadId: string, userId?: string): Promise<CommunityThread | null>;
    /**
     * List threads with filters and pagination
     */
    listThreads(page?: number, limit?: number, filters?: {
        status?: string;
        tags?: string[];
        search?: string;
    }, userId?: string): Promise<{
        threads: ThreadSummary[];
        total: number;
        page: number;
        limit: number;
    }>;
    /**
     * Update thread document using patch operations
     */
    updateDocument(threadId: string, request: UpdateDocumentRequest, userId: string): Promise<{
        thread: CommunityThread;
        changed: string[];
    }>;
    /**
     * Update thread status
     */
    updateStatus(threadId: string, newStatus: ThreadStatus, userId: string, isAdmin?: boolean): Promise<CommunityThread>;
    /**
     * Create a comment on a thread section
     */
    createComment(threadId: string, blockId: string, content: string, userId: string): Promise<DocumentComment>;
    /**
     * Get comments for a thread
     */
    getCommentsForThread(threadId: string, userId?: string): Promise<DocumentComment[]>;
    /**
     * Create FAQ from finalized thread (Meilenstein 2)
     */
    createFaqFromThread(threadId: string, adminUserId: string): Promise<any>;
    /**
     * Delete thread (admin only)
     */
    deleteThread(threadId: string, adminUserId: string): Promise<void>;
    /**
     * Search threads by semantic similarity
     */
    searchThreads(query: string, limit?: number): Promise<ThreadSummary[]>;
    /**
     * Index thread sections in Qdrant
     */
    private indexThreadSections;
    /**
     * Re-index changed sections
     */
    private reindexChangedSections;
    /**
     * Extract sections from thread for vector indexing
     */
    private extractSectionsForIndexing;
    /**
     * Access control: Can user read thread?
     */
    private canReadThread;
    /**
     * Access control: Can user read thread summary?
     */
    private canReadThreadSummary;
    /**
     * Access control: Can user edit thread?
     */
    private canEditThread;
    /**
     * Access control: Can user change status?
     */
    private canChangeStatus;
    /**
     * Access control: Can user comment on thread?
     */
    private canCommentOnThread;
    /**
     * Validate operations against current status
     */
    private validateOperationsForStatus;
    /**
     * Emit domain events (in-memory for now, could be message bus later)
     */
    private emitEvent;
    /**
     * Create a new community initiative from a finalized thread
     */
    createInitiative(threadId: string, request: CreateInitiativeRequest, userId: string): Promise<CommunityInitiative>;
    /**
     * Get initiative by ID
     */
    getInitiative(id: string): Promise<CommunityInitiative | null>;
    /**
     * Get initiative by thread ID
     */
    getInitiativeByThread(threadId: string): Promise<CommunityInitiative | null>;
    /**
     * Update initiative content
     */
    updateInitiative(id: string, updates: UpdateInitiativeRequest, userId: string): Promise<CommunityInitiative | null>;
    /**
     * Change initiative status
     */
    updateInitiativeStatus(id: string, status: InitiativeStatus, userId: string, submissionDetails?: Record<string, any>): Promise<CommunityInitiative | null>;
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
     * Delete initiative (only draft status)
     */
    deleteInitiative(id: string, userId: string): Promise<boolean>;
    /**
     * Generate initiative draft content using LLM
     */
    private generateInitiativeDraft;
    /**
     * Build LLM prompt for initiative generation
     */
    private buildInitiativePrompt;
    /**
     * Generate fallback draft when LLM is unavailable
     */
    private generateFallbackDraft;
    /**
     * Validate initiative status transitions
     */
    private isValidInitiativeStatusTransition;
}
//# sourceMappingURL=CommunityService.d.ts.map