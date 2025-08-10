import { Pool } from 'pg';
interface ReindexEvent {
    type: 'thread.updated' | 'thread.final_solution.set' | 'thread.created';
    threadId: string;
    changedSections: string[];
    timestamp: string;
}
export declare class CommunityReindexWorker {
    private qdrantService;
    private communityService;
    private eventQueue;
    private readonly debounceMs;
    constructor(db: Pool);
    /**
     * Add a reindex event to the debounced queue
     */
    scheduleReindex(event: ReindexEvent): void;
    /**
     * Process the actual reindexing
     */
    private processReindex;
    /**
     * Force immediate reindex of a thread (bypass debounce)
     */
    forceReindex(threadId: string): Promise<void>;
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
//# sourceMappingURL=CommunityReindexWorker.d.ts.map