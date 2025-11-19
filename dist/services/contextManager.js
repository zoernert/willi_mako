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
                includeUserDocuments: settings.ai_context_enabled,
                includeUserNotes: settings.ai_context_enabled,
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
            const hasPersonalKeywords = personalKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
            // Check if recent chat history mentions personal content
            const recentPersonalMentions = chatHistory.slice(-3).some(msg => personalKeywords.some(keyword => msg.content.toLowerCase().includes(keyword.toLowerCase())));
            // Use AI to determine if query benefits from personal context
            const aiAnalysis = await this.aiAnalyzeContextRelevance(query, chatHistory);
            // Apply priority settings
            let useUserContext = hasPersonalKeywords || recentPersonalMentions || aiAnalysis.relevant;
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
                includeDocuments: useUserContext && ((_a = contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserDocuments) !== null && _a !== void 0 ? _a : (aiAnalysis.documentsRelevant || hasPersonalKeywords)),
                includeNotes: useUserContext && ((_b = contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserNotes) !== null && _b !== void 0 ? _b : (aiAnalysis.notesRelevant || hasPersonalKeywords)),
                reason: contextSettings ?
                    `Kontext-Priorität: ${this.translatePriority(contextSettings.workspacePriority)}, ${aiAnalysis.reason || 'Benutzereinstellungen angewendet'}` :
                    (aiAnalysis.reason ||
                        (hasPersonalKeywords ? 'Anfrage enthält persönliche Schlagwörter' :
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
                const searchResults = await this.workspaceService.searchWorkspaceContent(userId, query, 'all', 10);
                // Process document results
                if (contextDecision.includeDocuments) {
                    const documentResults = searchResults.filter(r => r.type === 'document');
                    for (const doc of documentResults.slice(0, 3)) {
                        userDocuments.push(`Document: ${doc.title}\n${doc.content.substring(0, 500)}...`);
                    }
                    suggestedDocuments = documentResults;
                }
                // Process note results
                if (contextDecision.includeNotes) {
                    const noteResults = searchResults.filter(r => r.type === 'note');
                    for (const note of noteResults.slice(0, 5)) {
                        userNotes.push(`Note: ${note.title || 'Untitled'}\n${note.content.substring(0, 300)}...`);
                    }
                    relatedNotes = noteResults;
                }
            }
            // Generate context summary
            const contextSummary = this.generateContextSummary(userDocuments.length, userNotes.length, contextDecision);
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
    generateContextSummary(documentCount, noteCount, contextDecision) {
        const parts = [];
        if (documentCount > 0) {
            parts.push(`${documentCount} ${documentCount > 1 ? 'Dokumente' : 'Dokument'}`);
        }
        if (noteCount > 0) {
            parts.push(`${noteCount} ${noteCount > 1 ? 'Notizen' : 'Notiz'}`);
        }
        if (parts.length === 0) {
            return `Keine persönlichen Inhalte gefunden. ${contextDecision.reason}`;
        }
        return `Verwende ${parts.join(' und ')} aus deinem Workspace. ${contextDecision.reason}`;
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