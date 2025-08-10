// Community Reindex Worker
// CR-COMMUNITY-HUB-001 - Event-based reindexing
// Autor: AI Assistant
// Datum: 2025-08-09

import { CommunityQdrantService } from './CommunityQdrantService';
import { CommunityService } from './CommunityService';
import { Pool } from 'pg';

interface ReindexEvent {
  type: 'thread.updated' | 'thread.final_solution.set' | 'thread.created';
  threadId: string;
  changedSections: string[];
  timestamp: string;
}

export class CommunityReindexWorker {
  private qdrantService: CommunityQdrantService;
  private communityService: CommunityService;
  private eventQueue: Map<string, NodeJS.Timeout> = new Map();
  private readonly debounceMs = 1000; // 1 second debounce

  constructor(db: Pool) {
    this.qdrantService = new CommunityQdrantService();
    this.communityService = new CommunityService(db);
  }

  /**
   * Add a reindex event to the debounced queue
   */
  scheduleReindex(event: ReindexEvent): void {
    const { threadId, changedSections } = event;
    
    // Clear existing timeout for this thread
    if (this.eventQueue.has(threadId)) {
      clearTimeout(this.eventQueue.get(threadId)!);
    }

    // Schedule new reindex with debounce
    const timeout = setTimeout(async () => {
      try {
        await this.processReindex(threadId, changedSections);
        this.eventQueue.delete(threadId);
      } catch (error) {
        console.error(`Failed to reindex thread ${threadId}:`, error);
        // Could implement retry logic here
      }
    }, this.debounceMs);

    this.eventQueue.set(threadId, timeout);
    console.log(`Scheduled reindex for thread ${threadId} with sections: ${changedSections.join(', ')}`);
  }

  /**
   * Process the actual reindexing
   */
  private async processReindex(threadId: string, changedSections: string[]): Promise<void> {
    console.log(`Processing reindex for thread ${threadId}`);

    try {
      // Get current thread data
      const thread = await this.communityService.getThread(threadId);
      if (!thread) {
        console.warn(`Thread ${threadId} not found during reindex`);
        return;
      }

      const { document_content } = thread;
      const sectionsToUpdate: Array<{
        section_key: string;
        content: string;
        proposal_id?: string;
      }> = [];

      // Process each changed section
      for (const sectionKey of changedSections) {
        switch (sectionKey) {
          case 'problem_description':
            if (document_content.problem_description) {
              sectionsToUpdate.push({
                section_key: 'problem_description',
                content: document_content.problem_description
              });
            }
            break;

          case 'context':
            if (document_content.context) {
              sectionsToUpdate.push({
                section_key: 'context',
                content: document_content.context
              });
            }
            break;

          case 'analysis':
            if (document_content.analysis) {
              sectionsToUpdate.push({
                section_key: 'analysis',
                content: document_content.analysis
              });
            }
            break;

          case 'final_solution':
            if (document_content.final_solution?.content) {
              sectionsToUpdate.push({
                section_key: 'final_solution',
                content: document_content.final_solution.content
              });
            }
            break;

          case 'solution_proposals':
            if (document_content.solution_proposals) {
              for (const proposal of document_content.solution_proposals) {
                sectionsToUpdate.push({
                  section_key: 'proposal',
                  content: proposal.content,
                  proposal_id: proposal.id
                });
              }
            }
            break;
        }
      }

      // Batch update all changed sections
      if (sectionsToUpdate.length > 0) {
        await this.qdrantService.batchUpsertSections(threadId, sectionsToUpdate);
        console.log(`Successfully reindexed ${sectionsToUpdate.length} sections for thread ${threadId}`);
      }

    } catch (error) {
      console.error(`Error processing reindex for thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Force immediate reindex of a thread (bypass debounce)
   */
  async forceReindex(threadId: string): Promise<void> {
    // Cancel any pending reindex
    if (this.eventQueue.has(threadId)) {
      clearTimeout(this.eventQueue.get(threadId)!);
      this.eventQueue.delete(threadId);
    }

    try {
      const thread = await this.communityService.getThread(threadId);
      if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
      }

      // Reindex all sections
      const allSections = ['problem_description', 'context', 'analysis', 'final_solution', 'solution_proposals'];
      await this.processReindex(threadId, allSections);
    } catch (error) {
      console.error(`Error in force reindex for thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Clear all pending reindex jobs
   */
  clearAll(): void {
    for (const [threadId, timeout] of this.eventQueue.entries()) {
      clearTimeout(timeout);
    }
    this.eventQueue.clear();
    console.log('Cleared all pending reindex jobs');
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): { pendingJobs: number; threadIds: string[] } {
    return {
      pendingJobs: this.eventQueue.size,
      threadIds: Array.from(this.eventQueue.keys())
    };
  }
}
