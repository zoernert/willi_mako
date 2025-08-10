import { Pool } from 'pg';
interface CommunityEvent {
    type: 'thread.created' | 'thread.updated' | 'thread.final_solution.set';
    threadId: string;
    changedSections?: string[];
    timestamp: string;
    userId?: string;
}
export declare class CommunityEventManager {
    private db;
    private qdrantService;
    private reindexQueue;
    private readonly debounceMs;
    constructor(db: Pool);
    /**
     * Handle a community event
     */
    handleEvent(event: CommunityEvent): Promise<void>;
    /**
     * Schedule reindexing with debounce
     */
    private scheduleReindex;
    /**
     * Process immediate reindex (no debounce)
     */
    private processImmediateReindex;
    /**
     * Process the actual reindexing
     */
    private processReindex;
    /**
     * Clear all pending reindex jobs
     */
    clearAll(): void;
    /**
     * Get queue status for monitoring
     */
    getQueueStatus(): {
        pendingJobs: number;
        threadIds: string[];
    };
}
export {};
//# sourceMappingURL=CommunityEventManager.d.ts.map