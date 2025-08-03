"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
const workspaceService_1 = require("./workspaceService");
const notesService_1 = require("./notesService");
const gemini_1 = __importDefault(require("./gemini"));
const aiResponseUtils_1 = require("../utils/aiResponseUtils");
class ContextManager {
    constructor() {
        this.workspaceService = new workspaceService_1.WorkspaceService();
        this.notesService = new notesService_1.NotesService();
    }
    async determineOptimalContext(query, userId, chatHistory = [], contextSettings) {
        try {
            const settings = await this.workspaceService.getUserWorkspaceSettings(userId);
            const effectiveSettings = contextSettings || {
                useWorkspaceOnly: false,
                workspacePriority: 'medium',
                includeUserDocuments: settings.ai_context_enabled,
                includeUserNotes: settings.ai_context_enabled,
                includeSystemKnowledge: true,
            };
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
            if (effectiveSettings.useWorkspaceOnly) {
                const userContext = await this.gatherUserContext(userId, query, {
                    useUserContext: true,
                    includeDocuments: effectiveSettings.includeUserDocuments,
                    includeNotes: effectiveSettings.includeUserNotes,
                    reason: 'Workspace-only mode selected'
                });
                return {
                    publicContext: [],
                    userContext,
                    contextDecision: {
                        useUserContext: true,
                        includeDocuments: effectiveSettings.includeUserDocuments,
                        includeNotes: effectiveSettings.includeUserNotes,
                        reason: 'Workspace-only mode selected by user'
                    }
                };
            }
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
                publicContext: effectiveSettings.includeSystemKnowledge ? [] : [],
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
    async analyzeQueryForUserContext(query, chatHistory = [], contextSettings) {
        try {
            if (contextSettings?.workspacePriority === 'disabled') {
                return {
                    useUserContext: false,
                    includeDocuments: false,
                    includeNotes: false,
                    reason: 'Workspace context disabled by user'
                };
            }
            const personalKeywords = [
                'mein', 'meine', 'ich habe', 'wir haben', 'unser', 'unsere',
                'document', 'dokument', 'notiz', 'note', 'aufgeschrieben',
                'gespeichert', 'hochgeladen', 'datei', 'file'
            ];
            const hasPersonalKeywords = personalKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
            const recentPersonalMentions = chatHistory.slice(-3).some(msg => personalKeywords.some(keyword => msg.content.toLowerCase().includes(keyword.toLowerCase())));
            const aiAnalysis = await this.aiAnalyzeContextRelevance(query, chatHistory);
            let useUserContext = hasPersonalKeywords || recentPersonalMentions || aiAnalysis.relevant;
            if (contextSettings) {
                if (contextSettings.workspacePriority === 'high') {
                    useUserContext = true;
                }
                else if (contextSettings.workspacePriority === 'low') {
                    useUserContext = hasPersonalKeywords && aiAnalysis.relevant;
                }
            }
            return {
                useUserContext,
                includeDocuments: useUserContext && (contextSettings?.includeUserDocuments ?? (aiAnalysis.documentsRelevant || hasPersonalKeywords)),
                includeNotes: useUserContext && (contextSettings?.includeUserNotes ?? (aiAnalysis.notesRelevant || hasPersonalKeywords)),
                reason: contextSettings ?
                    `Context priority: ${contextSettings.workspacePriority}, ${aiAnalysis.reason || 'applied user settings'}` :
                    (aiAnalysis.reason ||
                        (hasPersonalKeywords ? 'Query contains personal keywords' :
                            recentPersonalMentions ? 'Recent conversation mentions personal content' :
                                'Query appears general, using public context only'))
            };
        }
        catch (error) {
            console.error('Error analyzing query for user context:', error);
            return {
                useUserContext: false,
                includeDocuments: false,
                includeNotes: false,
                reason: 'Error analyzing context relevance'
            };
        }
    }
    async aiAnalyzeContextRelevance(query, chatHistory = []) {
        try {
            const prompt = `
Analyze this user query to determine if it would benefit from personal context (user's documents and notes):

Query: "${query}"

Recent chat history:
${chatHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

IMPORTANT: Respond with valid JSON only, no markdown formatting or code blocks.

{
  "relevant": boolean,
  "documentsRelevant": boolean,
  "notesRelevant": boolean,
  "reason": "explanation"
}

Consider:
- Does the query reference personal content, documents, or notes?
- Would personal documents or notes likely contain relevant information?
- Is this a general question that wouldn't benefit from personal context?
`;
            const response = await gemini_1.default.generateResponse([{ role: 'user', content: prompt }], '', {}, false);
            const analysis = (0, aiResponseUtils_1.safeParseJsonResponse)(response);
            if (analysis) {
                return {
                    relevant: analysis.relevant || false,
                    documentsRelevant: analysis.documentsRelevant || false,
                    notesRelevant: analysis.notesRelevant || false,
                    reason: analysis.reason || 'AI analysis completed'
                };
            }
            else {
                return {
                    relevant: false,
                    documentsRelevant: false,
                    notesRelevant: false,
                    reason: 'Error parsing AI analysis'
                };
            }
        }
        catch (error) {
            console.error('Error in AI context analysis:', error);
            return {
                relevant: false,
                documentsRelevant: false,
                notesRelevant: false,
                reason: 'Error in AI analysis'
            };
        }
    }
    async gatherUserContext(userId, query, contextDecision) {
        const userDocuments = [];
        const userNotes = [];
        let suggestedDocuments = [];
        let relatedNotes = [];
        try {
            if (contextDecision.includeDocuments || contextDecision.includeNotes) {
                const searchResults = await this.workspaceService.searchWorkspaceContent(userId, query, 'all', 10);
                if (contextDecision.includeDocuments) {
                    const documentResults = searchResults.filter(r => r.type === 'document');
                    for (const doc of documentResults.slice(0, 3)) {
                        userDocuments.push(`Document: ${doc.title}\n${doc.content.substring(0, 500)}...`);
                    }
                    suggestedDocuments = documentResults;
                }
                if (contextDecision.includeNotes) {
                    const noteResults = searchResults.filter(r => r.type === 'note');
                    for (const note of noteResults.slice(0, 5)) {
                        userNotes.push(`Note: ${note.title || 'Untitled'}\n${note.content.substring(0, 300)}...`);
                    }
                    relatedNotes = noteResults;
                }
            }
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
    generateContextSummary(documentCount, noteCount, contextDecision) {
        const parts = [];
        if (documentCount > 0) {
            parts.push(`${documentCount} personal document${documentCount > 1 ? 's' : ''}`);
        }
        if (noteCount > 0) {
            parts.push(`${noteCount} personal note${noteCount > 1 ? 's' : ''}`);
        }
        if (parts.length === 0) {
            return `No personal context found. ${contextDecision.reason}`;
        }
        return `Using ${parts.join(' and ')} from your workspace. ${contextDecision.reason}`;
    }
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