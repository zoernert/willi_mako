"use strict";
// Community Service
// CR-COMMUNITY-HUB-001 - Meilenstein 1 & 2
// Autor: AI Assistant
// Datum: 2025-08-09
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const CommunityRepository_1 = require("../repositories/CommunityRepository");
const CommunityQdrantService_1 = require("./CommunityQdrantService");
const CommunityPublicationRepository_1 = require("../repositories/CommunityPublicationRepository");
const communityValidation_1 = require("../utils/communityValidation");
const featureFlags_1 = require("../utils/featureFlags");
const llmProvider_1 = __importDefault(require("./llmProvider"));
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
     * Publish a read-only snapshot of a community thread for public display
     */
    async publishThreadSnapshot(threadId, slug, publishedByUserId, opts) {
        const thread = await this.repository.getThreadById(threadId);
        if (!thread)
            throw new Error('Thread not found');
        // Optional business rule: allow publishing regardless of status; admin UI controls cadence
        // Normalize content (titles for proposals are ensured by repository on read)
        // Basic slug validation
        if (!/^[a-z0-9\-]+$/.test(slug)) {
            throw new Error('Invalid slug. Use lowercase letters, numbers, and dashes.');
        }
        const pubRepo = new CommunityPublicationRepository_1.CommunityPublicationRepository(this.db);
        const publication = await pubRepo.createPublication({
            thread,
            slug,
            title: opts === null || opts === void 0 ? void 0 : opts.title,
            summary: opts === null || opts === void 0 ? void 0 : opts.summary,
            publishedByUserId,
        });
        this.emitEvent('community.thread.published', {
            thread_id: threadId,
            slug,
            published_by: publishedByUserId,
        });
        return publication;
    }
    async getPublicationBySlug(slug) {
        const pubRepo = new CommunityPublicationRepository_1.CommunityPublicationRepository(this.db);
        return pubRepo.getBySlug(slug);
    }
    async listPublicationsByThread(threadId) {
        const pubRepo = new CommunityPublicationRepository_1.CommunityPublicationRepository(this.db);
        return pubRepo.listByThread(threadId);
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
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Verify thread exists
            const threadResult = await client.query('SELECT id FROM community_threads WHERE id = $1', [threadId]);
            if (threadResult.rows.length === 0) {
                throw new Error('Thread not found');
            }
            // Delete initiatives first (foreign key constraint)
            await client.query('DELETE FROM community_initiatives WHERE thread_id = $1', [threadId]);
            // Delete comments (will be cascade deleted, but explicit for clarity)
            await client.query('DELETE FROM document_comments WHERE thread_id = $1', [threadId]);
            // Delete the thread itself
            await client.query('DELETE FROM community_threads WHERE id = $1', [threadId]);
            await client.query('COMMIT');
            // Emit event for cleanup (Qdrant, etc.)
            this.emitEvent('community.thread.deleted', {
                threadId,
                deletedBy: adminUserId,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
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
                    content: proposal.title ? `${proposal.title}\n\n${proposal.content}` : proposal.content,
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
    // ===================================
    // COMMUNITY INITIATIVES (Meilenstein 3)
    // ===================================
    /**
     * Create a new community initiative from a finalized thread
     */
    async createInitiative(threadId, request, userId) {
        var _a;
        if (!(0, featureFlags_1.isFeatureEnabled)('FEATURE_COMMUNITY_HUB')) {
            throw new Error('Community Hub feature is disabled');
        }
        // Verify thread exists and is finalized
        const thread = await this.repository.getThreadById(threadId);
        if (!thread) {
            throw new Error('Thread not found');
        }
        if (thread.status !== 'final') {
            throw new Error('Can only create initiatives from finalized threads');
        }
        if (!((_a = thread.document_content.final_solution) === null || _a === void 0 ? void 0 : _a.content)) {
            throw new Error('Thread must have a final solution to create an initiative');
        }
        // Check if initiative already exists for this thread
        const existingInitiative = await this.repository.getInitiativeByThreadId(threadId);
        if (existingInitiative) {
            throw new Error('Initiative already exists for this thread');
        }
        // Generate initiative draft content using LLM
        const draftContent = await this.generateInitiativeDraft(thread, request);
        // Create initiative
        const initiative = await this.repository.createInitiative(threadId, request, draftContent, userId);
        // Emit event
        this.emitEvent('community.initiative.created', {
            initiative_id: initiative.id,
            thread_id: threadId,
            created_by: userId
        });
        return initiative;
    }
    /**
     * Get initiative by ID
     */
    async getInitiative(id) {
        return this.repository.getInitiativeById(id);
    }
    /**
     * Get initiative by thread ID
     */
    async getInitiativeByThread(threadId) {
        return this.repository.getInitiativeByThreadId(threadId);
    }
    /**
     * Update initiative content
     */
    async updateInitiative(id, updates, userId) {
        const initiative = await this.repository.getInitiativeById(id);
        if (!initiative) {
            throw new Error('Initiative not found');
        }
        // Check permissions (only creator or admin can update)
        if (initiative.created_by_user_id !== userId) {
            throw new Error('Permission denied: Only creator can update initiative');
        }
        if (initiative.status === 'submitted') {
            throw new Error('Cannot update submitted initiative');
        }
        const updatedInitiative = await this.repository.updateInitiative(id, updates);
        if (updatedInitiative) {
            this.emitEvent('community.initiative.updated', {
                initiative_id: id,
                updated_by: userId,
                changes: Object.keys(updates)
            });
        }
        return updatedInitiative;
    }
    /**
     * Change initiative status
     */
    async updateInitiativeStatus(id, status, userId, submissionDetails) {
        const initiative = await this.repository.getInitiativeById(id);
        if (!initiative) {
            throw new Error('Initiative not found');
        }
        // Check permissions
        if (initiative.created_by_user_id !== userId) {
            throw new Error('Permission denied: Only creator can change status');
        }
        // Validate status transition
        if (!this.isValidInitiativeStatusTransition(initiative.status, status)) {
            throw new Error(`Invalid status transition from ${initiative.status} to ${status}`);
        }
        const updatedInitiative = await this.repository.updateInitiativeStatus(id, status, submissionDetails);
        if (updatedInitiative) {
            this.emitEvent('community.initiative.status_changed', {
                initiative_id: id,
                old_status: initiative.status,
                new_status: status,
                updated_by: userId
            });
        }
        return updatedInitiative;
    }
    /**
     * List initiatives with filtering
     */
    async listInitiatives(page = 1, limit = 20, filters = {}) {
        return this.repository.listInitiatives(page, limit, filters);
    }
    /**
     * Delete initiative (only draft status)
     */
    async deleteInitiative(id, userId) {
        const initiative = await this.repository.getInitiativeById(id);
        if (!initiative) {
            throw new Error('Initiative not found');
        }
        // Check permissions
        if (initiative.created_by_user_id !== userId) {
            throw new Error('Permission denied: Only creator can delete initiative');
        }
        if (initiative.status !== 'draft') {
            throw new Error('Can only delete draft initiatives');
        }
        const deleted = await this.repository.deleteInitiative(id);
        if (deleted) {
            this.emitEvent('community.initiative.deleted', {
                initiative_id: id,
                deleted_by: userId
            });
        }
        return deleted;
    }
    /**
     * Generate initiative draft content using LLM
     */
    async generateInitiativeDraft(thread, request) {
        try {
            const promptText = this.buildInitiativePrompt(thread, request);
            // Convert prompt to message format
            const messages = [{ role: 'user', content: promptText }];
            const response = await llmProvider_1.default.generateResponse(messages);
            return response.trim();
        }
        catch (error) {
            console.error('Failed to generate initiative draft:', error);
            // Fallback: Simple template-based draft
            return this.generateFallbackDraft(thread, request);
        }
    }
    /**
     * Build LLM prompt for initiative generation
     */
    buildInitiativePrompt(thread, request) {
        var _a;
        const { document_content } = thread;
        const targetAudience = request.targetAudience || 'relevante Stakeholder';
        return `
Du bist ein Experte für Marktkommunikation in der Energiewirtschaft. Erstelle einen professionellen, formellen Entwurf für eine Gemeinschaftsinitiative basierend auf einem finalisierten Community-Lösungsdokument.

**Kontext:**
- Thread-Titel: ${thread.title}
- Zielgruppe: ${targetAudience}
- Finalisierte Lösung aus der Community

**Problemstellung:**
${document_content.problem_description || 'Nicht spezifiziert'}

**Kontext:**
${document_content.context || 'Nicht spezifiziert'}

**Analyse:**
${document_content.analysis || 'Nicht spezifiziert'}

**Finale Community-Lösung:**
${((_a = document_content.final_solution) === null || _a === void 0 ? void 0 : _a.content) || 'Nicht verfügbar'}

${request.customPrompt ? `**Zusätzliche Anweisungen:** ${request.customPrompt}` : ''}

**Aufgabe:**
Erstelle einen strukturierten, professionellen Entwurf für eine formelle Anfrage/Initiative an ${targetAudience}. Der Entwurf soll:

1. Das Problem klar definieren
2. Die Auswirkungen auf die Branche beschreiben
3. Die von der Community erarbeitete Lösung präsentieren
4. Konkrete Handlungsempfehlungen geben
5. Professional und respektvoll formuliert sein

**Format:**
- Betreff/Titel
- Anrede
- Problemdarstellung
- Lösungsvorschlag
- Begründung/Nutzen
- Konkrete Bitte/Forderung
- Höflicher Abschluss

Schreibe direkt den Entwurf, ohne Meta-Kommentare.
    `.trim();
    }
    /**
     * Generate fallback draft when LLM is unavailable
     */
    generateFallbackDraft(thread, request) {
        var _a;
        const { document_content } = thread;
        const targetAudience = request.targetAudience || 'Sehr geehrte Damen und Herren';
        return `
Betreff: ${request.title}

${targetAudience},

im Rahmen unserer Community-Initiative zur Verbesserung der Marktkommunikation in der Energiewirtschaft möchten wir folgendes Thema zur Diskussion stellen:

**Problemstellung:**
${document_content.problem_description || 'Ein relevantes Problem wurde identifiziert.'}

**Hintergrund:**
${document_content.context || 'Der Kontext wurde von der Community analysiert.'}

**Lösungsvorschlag:**
${((_a = document_content.final_solution) === null || _a === void 0 ? void 0 : _a.content) || 'Eine Lösung wurde gemeinschaftlich erarbeitet.'}

Wir würden uns über eine Stellungnahme und mögliche nächste Schritte freuen.

Mit freundlichen Grüßen,
Die Community-Initiative
    `.trim();
    }
    /**
     * Validate initiative status transitions
     */
    isValidInitiativeStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            'draft': ['refining', 'submitted'],
            'refining': ['draft', 'submitted'],
            'submitted': [] // Final state, no transitions allowed
        };
        return validTransitions[currentStatus].includes(newStatus);
    }
}
exports.CommunityService = CommunityService;
//# sourceMappingURL=CommunityService.js.map