"use strict";
// Community Service
// CR-COMMUNITY-HUB-001 - Meilenstein 1 & 2
// Autor: AI Assistant
// Datum: 2025-08-09
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const CommunityRepository_1 = require("../repositories/CommunityRepository");
const CommunityQdrantService_1 = require("./CommunityQdrantService");
const communityValidation_1 = require("../utils/communityValidation");
const featureFlags_1 = require("../utils/featureFlags");
class CommunityService {
    constructor(db, qdrantService) {
        this.db = db;
        this.config = (0, featureFlags_1.getCommunityConfig)();
        this.repository = new CommunityRepository_1.CommunityRepository(db);
        this.qdrantService = qdrantService || new CommunityQdrantService_1.CommunityQdrantService(this.config.QDRANT_COMMUNITY_COLLECTION);
    }
    /**
     * Create a new community thread
     */
    async createThread(request, userId) {
        // Validate input
        (0, communityValidation_1.validateCreateThreadRequest)(request);
        // Create thread in database
        const thread = await this.repository.createThread(request, userId);
        // Index initial content in Qdrant (async)
        this.indexThreadSections(thread).catch(error => {
            console.error('Failed to index thread sections:', error);
        });
        // Emit event
        this.emitEvent('community.thread.created', {
            thread_id: thread.id,
            status: thread.status,
            created_by: userId
        });
        return thread;
    }
    /**
     * Get thread by ID with access control
     */
    async getThread(threadId, userId) {
        const thread = await this.repository.getThreadById(threadId);
        if (!thread) {
            return null;
        }
        // Check access permissions
        if (!this.canReadThread(thread, userId)) {
            return null;
        }
        return thread;
    }
    /**
     * List threads with filters and pagination
     */
    async listThreads(page = 1, limit = 20, filters = {}, userId) {
        const result = await this.repository.listThreads(page, limit, filters);
        // Filter out threads user can't access
        const accessibleThreads = result.threads.filter(thread => this.canReadThreadSummary(thread, userId));
        return {
            threads: accessibleThreads,
            total: result.total,
            page,
            limit
        };
    }
    /**
     * Update thread document using patch operations
     */
    async updateDocument(threadId, request, userId) {
        // Validate input
        (0, communityValidation_1.validateUpdateDocumentRequest)(request);
        // Check permissions
        const existingThread = await this.repository.getThreadById(threadId);
        if (!existingThread) {
            throw new Error('Thread not found');
        }
        if (!this.canEditThread(existingThread, userId)) {
            throw new Error('Access denied');
        }
        // Validate status-dependent operations
        this.validateOperationsForStatus(request.operations, existingThread.status, userId);
        // Apply patch operations
        const result = await this.repository.updateDocument(threadId, request.operations, userId, request.version);
        // Re-index changed sections (async)
        if (result.changed.length > 0) {
            this.reindexChangedSections(result.thread, result.changed).catch(error => {
                console.error('Failed to reindex sections:', error);
            });
        }
        // Emit event
        this.emitEvent('community.thread.updated', {
            thread_id: threadId,
            changed_sections: result.changed,
            patch_ops_count: request.operations.length,
            user_id: userId
        });
        return result;
    }
    /**
     * Update thread status
     */
    async updateStatus(threadId, newStatus, userId, isAdmin = false) {
        // Validate status
        if (!(0, communityValidation_1.isValidThreadStatus)(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }
        const existingThread = await this.repository.getThreadById(threadId);
        if (!existingThread) {
            throw new Error('Thread not found');
        }
        // Check permissions
        if (!this.canChangeStatus(existingThread, userId, isAdmin)) {
            throw new Error('Access denied');
        }
        // Validate status transition
        if (!isAdmin && !(0, communityValidation_1.validateStatusTransition)(existingThread.status, newStatus)) {
            throw new Error(`Invalid status transition from ${existingThread.status} to ${newStatus}`);
        }
        const updatedThread = await this.repository.updateStatus(threadId, newStatus, userId);
        // Emit specific event for final status
        if (newStatus === 'final') {
            this.emitEvent('community.thread.status.final', {
                thread_id: threadId,
                approved_by: userId
            });
        }
        // Emit general status update event
        this.emitEvent('community.thread.status.changed', {
            thread_id: threadId,
            old_status: existingThread.status,
            new_status: newStatus,
            user_id: userId
        });
        return updatedThread;
    }
    /**
     * Create a comment on a thread section
     */
    async createComment(threadId, blockId, content, userId) {
        // Validate input
        (0, communityValidation_1.validateCreateCommentRequest)({ blockId, content });
        // Check thread exists and user can comment
        const thread = await this.repository.getThreadById(threadId);
        if (!thread) {
            throw new Error('Thread not found');
        }
        if (!this.canCommentOnThread(thread, userId)) {
            throw new Error('Access denied');
        }
        const comment = await this.repository.createComment(threadId, blockId, content, userId);
        // Emit event
        this.emitEvent('community.comment.created', {
            thread_id: threadId,
            comment_id: comment.id,
            block_id: blockId,
            user_id: userId
        });
        return comment;
    }
    /**
     * Get comments for a thread
     */
    async getCommentsForThread(threadId, userId) {
        const thread = await this.repository.getThreadById(threadId);
        if (!thread) {
            throw new Error('Thread not found');
        }
        if (!this.canReadThread(thread, userId)) {
            throw new Error('Access denied');
        }
        return await this.repository.getCommentsForThread(threadId);
    }
    /**
     * Create FAQ from finalized thread (Meilenstein 2)
     */
    async createFaqFromThread(threadId, adminUserId) {
        var _a;
        const thread = await this.repository.getThreadById(threadId);
        if (!thread) {
            throw new Error('Thread not found');
        }
        if (thread.status !== 'final') {
            throw new Error('Thread must be in final status to create FAQ');
        }
        if (!((_a = thread.document_content.final_solution) === null || _a === void 0 ? void 0 : _a.content)) {
            throw new Error('Thread must have a final solution to create FAQ');
        }
        // Extract final solution content
        const finalSolution = thread.document_content.final_solution.content;
        const context = [
            thread.document_content.problem_description,
            thread.document_content.context
        ].filter(Boolean).join('\n\n');
        // Create FAQ using existing FAQ service (would be implemented in routes)
        const faqData = {
            title: thread.title,
            description: thread.document_content.problem_description || '',
            context: context,
            answer: finalSolution,
            tags: thread.tags,
            source: 'community',
            source_thread_id: thread.id
        };
        // This would call the existing FAQ service
        // For now, return the prepared data
        return faqData;
    }
    /**
     * Delete thread (admin only)
     */
    async deleteThread(threadId, adminUserId) {
        // Remove from Qdrant
        try {
            await this.qdrantService.deleteThreadVectors(threadId);
        }
        catch (error) {
            console.error('Failed to delete thread vectors:', error);
        }
        // Delete from database
        const deleted = await this.repository.deleteThread(threadId);
        if (deleted) {
            this.emitEvent('community.thread.deleted', {
                thread_id: threadId,
                deleted_by: adminUserId
            });
        }
        return deleted;
    }
    /**
     * Search threads by semantic similarity
     */
    async searchThreads(query, limit = 10) {
        try {
            const searchResults = await this.qdrantService.searchByText(query, limit);
            const threadIds = [...new Set(searchResults.map(r => { var _a; return (_a = r.payload) === null || _a === void 0 ? void 0 : _a.thread_id; }))];
            if (threadIds.length === 0) {
                return [];
            }
            // Get threads from database
            const allThreads = await this.repository.listThreads(1, 100);
            const matchingThreads = allThreads.threads.filter(t => threadIds.includes(t.id));
            // Sort by search relevance
            const sortedThreads = matchingThreads.sort((a, b) => {
                const aIndex = threadIds.indexOf(a.id);
                const bIndex = threadIds.indexOf(b.id);
                return aIndex - bIndex;
            });
            return sortedThreads.slice(0, limit);
        }
        catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }
    /**
     * Index thread sections in Qdrant
     */
    async indexThreadSections(thread) {
        const sections = this.extractSectionsForIndexing(thread);
        for (const section of sections) {
            await this.qdrantService.upsertVector(section.content, section);
        }
    }
    /**
     * Re-index changed sections
     */
    async reindexChangedSections(thread, changedSections) {
        const sections = this.extractSectionsForIndexing(thread)
            .filter(s => changedSections.includes(s.section_key));
        for (const section of sections) {
            await this.qdrantService.upsertVector(section.content, section);
        }
    }
    /**
     * Extract sections from thread for vector indexing
     */
    extractSectionsForIndexing(thread) {
        var _a;
        const sections = [];
        const doc = thread.document_content;
        // Index main sections
        if (doc.problem_description) {
            sections.push({
                thread_id: thread.id,
                section_key: 'problem_description',
                content: doc.problem_description,
                created_at: thread.updated_at
            });
        }
        if (doc.context) {
            sections.push({
                thread_id: thread.id,
                section_key: 'context',
                content: doc.context,
                created_at: thread.updated_at
            });
        }
        if (doc.analysis) {
            sections.push({
                thread_id: thread.id,
                section_key: 'analysis',
                content: doc.analysis,
                created_at: thread.updated_at
            });
        }
        if ((_a = doc.final_solution) === null || _a === void 0 ? void 0 : _a.content) {
            sections.push({
                thread_id: thread.id,
                section_key: 'final_solution',
                content: doc.final_solution.content,
                created_at: thread.updated_at
            });
        }
        // Index proposals
        if (doc.solution_proposals) {
            for (const proposal of doc.solution_proposals) {
                sections.push({
                    thread_id: thread.id,
                    section_key: 'proposal',
                    content: proposal.content,
                    proposal_id: proposal.id,
                    created_at: proposal.created_at
                });
            }
        }
        return sections;
    }
    /**
     * Access control: Can user read thread?
     */
    canReadThread(thread, userId) {
        // Public read if enabled
        if ((0, featureFlags_1.isFeatureEnabled)('COMMUNITY_ENABLE_PUBLIC_READ')) {
            return true;
        }
        // Must be authenticated
        return !!userId;
    }
    /**
     * Access control: Can user read thread summary?
     */
    canReadThreadSummary(thread, userId) {
        return this.canReadThread(thread, userId);
    }
    /**
     * Access control: Can user edit thread?
     */
    canEditThread(thread, userId) {
        // Thread creator can always edit (unless final)
        if (thread.created_by_user_id === userId && thread.status !== 'final') {
            return true;
        }
        // TODO: Add role-based permissions for moderators
        return false;
    }
    /**
     * Access control: Can user change status?
     */
    canChangeStatus(thread, userId, isAdmin) {
        if (isAdmin) {
            return true;
        }
        // Only thread creator can change status
        return thread.created_by_user_id === userId;
    }
    /**
     * Access control: Can user comment on thread?
     */
    canCommentOnThread(thread, userId) {
        // Any authenticated user can comment (for now)
        return !!userId;
    }
    /**
     * Validate operations against current status
     */
    validateOperationsForStatus(operations, currentStatus, userId) {
        if (currentStatus === 'final') {
            const hasRestrictedOps = operations.some(op => op.path === '/final_solution' ||
                op.op === 'upsertProposal');
            if (hasRestrictedOps) {
                throw new Error('Cannot modify solutions when thread is finalized');
            }
        }
    }
    /**
     * Emit domain events (in-memory for now, could be message bus later)
     */
    emitEvent(eventType, payload) {
        const event = {
            event: eventType,
            ts: new Date().toISOString(),
            ...payload
        };
        // Log for development
        if (process.env.NODE_ENV === 'development') {
            console.log('[COMMUNITY EVENT]', JSON.stringify(event));
        }
        // In production, this would publish to message bus
        // For now, just log
    }
}
exports.CommunityService = CommunityService;
//# sourceMappingURL=CommunityService.js.map