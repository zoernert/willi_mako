// Community Event Manager
// CR-COMMUNITY-HUB-001 - Event handling without circular dependencies
// Autor: AI Assistant
// Datum: 2025-08-09

import { Pool } from 'pg';
import { CommunityQdrantService } from './CommunityQdrantService';
import { CommunityService } from './CommunityService';

interface CommunityEvent {
  type: 'thread.created' | 'thread.updated' | 'thread.final_solution.set';
  threadId: string;
  changedSections?: string[];
  timestamp: string;
  userId?: string;
}

export class CommunityEventManager {
  private qdrantService: CommunityQdrantService;
  private reindexQueue: Map<string, NodeJS.Timeout> = new Map();
  private readonly debounceMs = 1000; // 1 second debounce

  constructor(private db: Pool) {
    this.qdrantService = new CommunityQdrantService();
  }

  /**
   * Handle a community event
   */
  async handleEvent(event: CommunityEvent): Promise<void> {
    console.log('[COMMUNITY EVENT]', JSON.stringify(event));

    switch (event.type) {
      case 'thread.created':
      case 'thread.updated':
        if (event.changedSections && event.changedSections.length > 0) {
          this.scheduleReindex(event.threadId, event.changedSections);
        }
        break;
      
      case 'thread.final_solution.set':
        // Immediate reindex for final solutions
        await this.processImmediateReindex(event.threadId, ['final_solution']);
        break;
    }
  }

  /**
   * Schedule reindexing with debounce
   */
  private scheduleReindex(threadId: string, changedSections: string[]): void {
    // Clear existing timeout for this thread
    if (this.reindexQueue.has(threadId)) {
      clearTimeout(this.reindexQueue.get(threadId)!);
    }

    // Schedule new reindex with debounce
    const timeout = setTimeout(async () => {
      try {
        await this.processReindex(threadId, changedSections);
        this.reindexQueue.delete(threadId);
      } catch (error) {
        console.error(`Failed to reindex thread ${threadId}:`, error);
        // Could implement retry logic here
      }
    }, this.debounceMs);

    this.reindexQueue.set(threadId, timeout);
    console.log(`Scheduled reindex for thread ${threadId} with sections: ${changedSections.join(', ')}`);
  }

  /**
   * Process immediate reindex (no debounce)
   */
  private async processImmediateReindex(threadId: string, sections: string[]): Promise<void> {
    try {
      await this.processReindex(threadId, sections);
    } catch (error) {
      console.error(`Failed immediate reindex for thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Process the actual reindexing
   */
  private async processReindex(threadId: string, changedSections: string[]): Promise<void> {
    console.log(`Processing reindex for thread ${threadId}`);

    try {
      // Get thread data (we need to avoid circular dependency, so query directly)
      const result = await this.db.query(`
        SELECT id, title, document_content, status, tags, created_by_user_id, created_at, updated_at
        FROM community_threads 
        WHERE id = $1
      `, [threadId]);

      if (result.rows.length === 0) {
        console.warn(`Thread ${threadId} not found during reindex`);
        return;
      }

      const thread = result.rows[0];
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
                    content: proposal.title ? `${proposal.title}\n\n${proposal.content}` : proposal.content,
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
   * Clear all pending reindex jobs
   */
  clearAll(): void {
    for (const [threadId, timeout] of this.reindexQueue.entries()) {
      clearTimeout(timeout);
    }
    this.reindexQueue.clear();
    console.log('Cleared all pending reindex jobs');
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): { pendingJobs: number; threadIds: string[] } {
    return {
      pendingJobs: this.reindexQueue.size,
      threadIds: Array.from(this.reindexQueue.keys())
    };
  }
}
