"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
const workspaceService_1 = require("./workspaceService");
const notesService_1 = require("./notesService");
const llmProvider_1 = __importDefault(require("./llmProvider"));
const aiResponseUtils_1 = require("../utils/aiResponseUtils");
class ContextManager {
    constructor() {
        this.workspaceService = new workspaceService_1.WorkspaceService();
        this.notesService = new notesService_1.NotesService();
    }
    /**
     * Translate priority level to German
     */
    translatePriority(priority) {
        const translations = {
            'high': 'Hoch',
            'medium': 'Mittel',
            'low': 'Niedrig',
            'disabled': 'Deaktiviert'
        };
        return translations[priority] || priority;
    }
    /**
     * Determine optimal context for a chat query with custom context settings
     */
    async determineOptimalContext(query, userId, chatHistory = [], contextSettings) {
        try {
            // Get user workspace settings
            const settings = await this.workspaceService.getUserWorkspaceSettings(userId);
            // Apply context settings if provided, otherwise use defaults
            const effectiveSettings = contextSettings || {
                useWorkspaceOnly: false,
                workspacePriority: 'medium',
                includeUserDocuments: settings.ai_context_enabled, // Default: enabled if AI context is on
                includeUserNotes: settings.ai_context_enabled, // Default: enabled if AI context is on
                includeSystemKnowledge: true,
                includeM2CRoles: false,
            };
            // If AI context is disabled, return empty user context
            if (!settings.ai_context_enabled && !contextSettings) {
                return {
                    publicContext: [],
                    userContext: {
                        userDocuments: [],
                        userNotes: [],
                        suggestedDocuments: [],
                        relatedNotes: [],
                        contextSummary: 'AI context disabled by user'
                    },
                    contextDecision: {
                        useUserContext: false,
                        includeDocuments: false,
                        includeNotes: false,
                        reason: 'User has disabled AI context in workspace settings'
                    }
                };
            }
            // Handle workspace-only mode
            if (effectiveSettings.useWorkspaceOnly) {
                const userContext = await this.gatherUserContext(userId, query, {
                    useUserContext: true,
                    includeDocuments: effectiveSettings.includeUserDocuments,
                    includeNotes: effectiveSettings.includeUserNotes,
                    reason: 'Workspace-only mode selected'
                });
                return {
                    publicContext: [], // No system knowledge in workspace-only mode
                    userContext,
                    contextDecision: {
                        useUserContext: true,
                        includeDocuments: effectiveSettings.includeUserDocuments,
                        includeNotes: effectiveSettings.includeUserNotes,
                        reason: 'Workspace-only mode selected by user'
                    }
                };
            }
            // Standard mode with priority handling
            const contextDecision = await this.analyzeQueryForUserContext(query, chatHistory, effectiveSettings);
            let userContext = {
                userDocuments: [],
                userNotes: [],
                suggestedDocuments: [],
                relatedNotes: [],
                contextSummary: ''
            };
            if (contextDecision.useUserContext) {
                userContext = await this.gatherUserContext(userId, query, contextDecision);
            }
            return {
                publicContext: effectiveSettings.includeSystemKnowledge ? [] : [], // Will be handled in route
                userContext,
                contextDecision
            };
        }
        catch (error) {
            console.error('Error determining optimal context:', error);
            return {
                publicContext: [],
                userContext: {
                    userDocuments: [],
                    userNotes: [],
                    suggestedDocuments: [],
                    relatedNotes: [],
                    contextSummary: 'Error determining context'
                },
                contextDecision: {
                    useUserContext: false,
                    includeDocuments: false,
                    includeNotes: false,
                    reason: 'Error analyzing context relevance'
                }
            };
        }
    }
    /**
     * Analyze if the query would benefit from user context
     */
    async analyzeQueryForUserContext(query, chatHistory = [], contextSettings) {
        var _a, _b;
        try {
            // If context settings are provided with disabled workspace priority, skip analysis
            if ((contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.workspacePriority) === 'disabled') {
                return {
                    useUserContext: false,
                    includeDocuments: false,
                    includeNotes: false,
                    reason: 'Workspace-Kontext vom Benutzer deaktiviert'
                };
            }
            // Keywords that suggest personal context might be relevant
            const personalKeywords = [
                'mein', 'meine', 'ich habe', 'wir haben', 'unser', 'unsere',
                'document', 'dokument', 'notiz', 'note', 'aufgeschrieben',
                'gespeichert', 'hochgeladen', 'datei', 'file'
            ];
            // Industry-specific keywords that suggest uploaded documents might be relevant
            const industryKeywords = [
                'VBEW', 'BDEW', 'BKZ', 'Baukostenzuschuss', 'systemdienlich',
                'Netzanschluss', 'Speicher', 'VNB', 'ÜNB', 'EnWG', 'StromNEV',
                'TAB', 'Marktkommunikation', 'UTILMD', 'MSCONS', 'GPKE', 'WiM'
            ];
            const hasPersonalKeywords = personalKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
            const hasIndustryKeywords = industryKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
            // Check if recent chat history mentions personal content
            const recentPersonalMentions = chatHistory.slice(-3).some(msg => personalKeywords.some(keyword => msg.content.toLowerCase().includes(keyword.toLowerCase())));
            // Use AI to determine if query benefits from personal context
            const aiAnalysis = await this.aiAnalyzeContextRelevance(query, chatHistory);
            // Apply priority settings
            let useUserContext = hasPersonalKeywords || hasIndustryKeywords || recentPersonalMentions || aiAnalysis.relevant;
            if (contextSettings) {
                // High priority: always use workspace context
                if (contextSettings.workspacePriority === 'high') {
                    useUserContext = true;
                }
                // Low priority: only use if very clear indicators
                else if (contextSettings.workspacePriority === 'low') {
                    useUserContext = hasPersonalKeywords && aiAnalysis.relevant;
                }
                // Medium priority: default behavior (already set above)
            }
            return {
                useUserContext,
                includeDocuments: useUserContext && ((_a = contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserDocuments) !== null && _a !== void 0 ? _a : (aiAnalysis.documentsRelevant || hasPersonalKeywords || hasIndustryKeywords)),
                includeNotes: useUserContext && ((_b = contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserNotes) !== null && _b !== void 0 ? _b : (aiAnalysis.notesRelevant || hasPersonalKeywords)),
                reason: contextSettings ?
                    `Kontext-Priorität: ${this.translatePriority(contextSettings.workspacePriority)}, ${aiAnalysis.reason || 'Benutzereinstellungen angewendet'}` :
                    (aiAnalysis.reason ||
                        (hasPersonalKeywords ? 'Anfrage enthält persönliche Schlagwörter' :
                            hasIndustryKeywords ? 'Anfrage enthält Fachbegriffe - prüfe Workspace-Dokumente' :
                                recentPersonalMentions ? 'Konversation erwähnt persönliche Inhalte' :
                                    'Anfrage erscheint allgemein, verwende nur öffentlichen Kontext'))
            };
        }
        catch (error) {
            console.error('Error analyzing query for user context:', error);
            return {
                useUserContext: false,
                includeDocuments: false,
                includeNotes: false,
                reason: 'Fehler bei der Kontextanalyse'
            };
        }
    }
    /**
     * Use AI to analyze if query would benefit from personal context
     */
    async aiAnalyzeContextRelevance(query, chatHistory = []) {
        try {
            const prompt = `
Analysiere diese Benutzeranfrage, um festzustellen, ob sie von persönlichem Kontext (Dokumente und Notizen des Benutzers) profitieren würde:

Anfrage: "${query}"

Aktueller Chat-Verlauf:
${chatHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

WICHTIG: Antworte nur mit gültigem JSON, ohne Markdown-Formatierung oder Code-Blöcke.

{
  "relevant": boolean,
  "documentsRelevant": boolean,
  "notesRelevant": boolean,
  "reason": "Erklärung in 1-2 Sätzen, warum persönlicher Kontext relevant oder nicht relevant ist"
}

Beachte:
- Erwähnt die Anfrage persönliche Inhalte, Dokumente oder Notizen?
- Würden persönliche Dokumente oder Notizen wahrscheinlich relevante Informationen enthalten?
- Ist dies eine allgemeine Frage, die nicht von persönlichem Kontext profitieren würde?
`;
            const response = await llmProvider_1.default.generateResponse([{ role: 'user', content: prompt }], '', {}, false);
            const analysis = (0, aiResponseUtils_1.safeParseJsonResponse)(response);
            if (analysis) {
                return {
                    relevant: analysis.relevant || false,
                    documentsRelevant: analysis.documentsRelevant || false,
                    notesRelevant: analysis.notesRelevant || false,
                    reason: analysis.reason || 'KI-Analyse abgeschlossen'
                };
            }
            else {
                return {
                    relevant: false,
                    documentsRelevant: false,
                    notesRelevant: false,
                    reason: 'Fehler beim Parsen der KI-Analyse'
                };
            }
        }
        catch (error) {
            console.error('Error in AI context analysis:', error);
            return {
                relevant: false,
                documentsRelevant: false,
                notesRelevant: false,
                reason: 'Fehler bei der KI-Analyse'
            };
        }
    }
    /**
     * Gather relevant user context based on query
     */
    async gatherUserContext(userId, query, contextDecision) {
        const userDocuments = [];
        const userNotes = [];
        let suggestedDocuments = [];
        let relatedNotes = [];
        try {
            // Search user's workspace if context is relevant
            if (contextDecision.includeDocuments || contextDecision.includeNotes) {
                // Enhanced search: try original query first, then extract dates/codes for fallback
                // Request more results to get better coverage (20 instead of 10)
                let searchResults = await this.workspaceService.searchWorkspaceContent(userId, query, 'all', 20);
                // If no good results, try extracting specific terms (dates, codes, keywords)
                const hasRelevantResults = searchResults.some(r => {
                    const score = r.relevance_score || r.score || 0;
                    return score >= 0.65;
                });
                if (!hasRelevantResults) {
                    // Extract potential search terms (dates like "15. Juli 2025", codes like "EnVR 1/24")
                    const dateMatch = query.match(/(\d{1,2}\.\s*\w+\s*\d{4})/);
                    const codeMatch = query.match(/([A-Z]{2,}[A-Z\d\s\/\-]+)/);
                    const fallbackQueries = [];
                    if (dateMatch) {
                        // Convert "15. Juli 2025" to "20250715" or "2025-07-15"
                        const dateStr = dateMatch[1];
                        fallbackQueries.push(dateStr);
                    }
                    if (codeMatch) {
                        fallbackQueries.push(codeMatch[1]);
                    }
                    // Try fallback searches
                    for (const fallbackQuery of fallbackQueries) {
                        const fallbackResults = await this.workspaceService.searchWorkspaceContent(userId, fallbackQuery, 'all', 20);
                        // Merge results, keeping best scores
                        for (const result of fallbackResults) {
                            const existingIndex = searchResults.findIndex(r => r.id === result.id);
                            if (existingIndex === -1) {
                                searchResults.push(result);
                            }
                            else {
                                // Keep the one with better score
                                const existingScore = searchResults[existingIndex].relevance_score || searchResults[existingIndex].score || 0;
                                const newScore = result.relevance_score || result.score || 0;
                                if (newScore > existingScore) {
                                    searchResults[existingIndex] = result;
                                }
                            }
                        }
                    }
                    // Re-sort by score
                    searchResults.sort((a, b) => {
                        const scoreA = a.relevance_score || a.score || 0;
                        const scoreB = b.relevance_score || b.score || 0;
                        return scoreB - scoreA;
                    });
                }
                // Process document results with relevance threshold
                if (contextDecision.includeDocuments) {
                    // Lower threshold to 55% to catch more relevant documents
                    // Multi-chunk retrieval means documents with multiple relevant chunks will have better average scores
                    const RELEVANCE_THRESHOLD = 0.55; // 55% minimum relevance (lowered from 65%)
                    const documentResults = searchResults
                        .filter(r => r.type === 'document')
                        .filter(doc => {
                        const score = doc.relevance_score || doc.score || 0;
                        return score >= RELEVANCE_THRESHOLD;
                    });
                    // Take top 5 documents instead of 3 to provide more context
                    for (const doc of documentResults.slice(0, 5)) {
                        userDocuments.push(`Document: ${doc.title}\n${doc.content.substring(0, 500)}...`);
                    }
                    suggestedDocuments = documentResults;
                }
                // Process note results with relevance threshold
                if (contextDecision.includeNotes) {
                    const RELEVANCE_THRESHOLD = 0.65; // 65% minimum relevance
                    const noteResults = searchResults
                        .filter(r => r.type === 'note')
                        .filter(note => {
                        const score = note.relevance_score || note.score || 0;
                        return score >= RELEVANCE_THRESHOLD;
                    });
                    for (const note of noteResults.slice(0, 5)) {
                        userNotes.push(`Note: ${note.title || 'Untitled'}\n${note.content.substring(0, 300)}...`);
                    }
                    relatedNotes = noteResults;
                }
            }
            // Generate context summary with document details
            const contextSummary = this.generateContextSummary(userDocuments.length, userNotes.length, contextDecision, suggestedDocuments.slice(0, 3), // Pass top 3 documents for detailed summary
            relatedNotes.slice(0, 3));
            return {
                userDocuments,
                userNotes,
                suggestedDocuments,
                relatedNotes,
                contextSummary
            };
        }
        catch (error) {
            console.error('Error gathering user context:', error);
            return {
                userDocuments: [],
                userNotes: [],
                suggestedDocuments: [],
                relatedNotes: [],
                contextSummary: 'Error gathering user context'
            };
        }
    }
    /**
     * Generate a summary of the context being used
     */
    generateContextSummary(documentCount, noteCount, contextDecision, documents = [], notes = []) {
        // Check if context decision wanted documents but none were relevant enough
        const wantedDocuments = contextDecision.includeDocuments;
        const noRelevantDocs = wantedDocuments && documentCount === 0 && documents.length === 0;
        if (noRelevantDocs) {
            return `Keine ausreichend relevanten Dokumente gefunden (Mindest-Relevanz: 65%). ${contextDecision.reason} Möglicherweise findest du die gesuchten Informationen in einem anderen Dokument in deinem Workspace.`;
        }
        if (documentCount === 0 && noteCount === 0) {
            return `Keine persönlichen Inhalte gefunden. ${contextDecision.reason}`;
        }
        const parts = [];
        // Generate document details
        if (documentCount > 0 && documents.length > 0) {
            const docParts = [];
            documents.forEach((doc, index) => {
                const score = doc.relevance_score || doc.score;
                const title = doc.title || `Dokument ${index + 1}`;
                const scorePercent = score ? Math.round(score * 100) : undefined;
                if (index === 0) {
                    // Primary document
                    if (scorePercent) {
                        docParts.push(`hauptsächlich "${title}" (Relevanz: ${scorePercent}%)`);
                    }
                    else {
                        docParts.push(`hauptsächlich "${title}"`);
                    }
                }
                else if (index === 1 && documents.length > 1) {
                    // Secondary document
                    if (scorePercent) {
                        docParts.push(`ergänzt durch "${title}" (${scorePercent}%)`);
                    }
                    else {
                        docParts.push(`ergänzt durch "${title}"`);
                    }
                }
                else if (index > 1) {
                    // Additional documents - just add to count
                    if (scorePercent) {
                        docParts.push(`"${title}" (${scorePercent}%)`);
                    }
                    else {
                        docParts.push(`"${title}"`);
                    }
                }
            });
            parts.push(`Verwende ${docParts.join(', ')}`);
        }
        else if (documentCount > 0) {
            // Fallback if no document objects available
            parts.push(`Verwende ${documentCount} ${documentCount > 1 ? 'Dokumente' : 'Dokument'}`);
        }
        // Generate note details
        if (noteCount > 0 && notes.length > 0) {
            const noteTitles = notes.map(n => { var _a; return n.title || ((_a = n.content) === null || _a === void 0 ? void 0 : _a.substring(0, 30)); }).filter(Boolean);
            if (noteTitles.length > 0) {
                const noteText = `und ${noteCount} ${noteCount > 1 ? 'Notizen' : 'Notiz'}`;
                parts.push(noteText);
            }
        }
        else if (noteCount > 0) {
            parts.push(`und ${noteCount} ${noteCount > 1 ? 'Notizen' : 'Notiz'}`);
        }
        const summary = parts.join(' ');
        return `${summary} aus deinem Workspace. ${contextDecision.reason}`;
    }
    /**
     * Get user's workspace context settings
     */
    async getUserContextSettings(userId) {
        try {
            const settings = await this.workspaceService.getUserWorkspaceSettings(userId);
            return {
                aiContextEnabled: settings.ai_context_enabled,
                autoTagEnabled: settings.auto_tag_enabled,
                contextPreferences: settings.settings || {}
            };
        }
        catch (error) {
            console.error('Error getting user context settings:', error);
            return {
                aiContextEnabled: false,
                autoTagEnabled: false,
                contextPreferences: {}
            };
        }
    }
}
exports.ContextManager = ContextManager;
exports.default = new ContextManager();
//# sourceMappingURL=contextManager.js.map