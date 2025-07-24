import pool from '../config/database';
import { WorkspaceService } from './workspaceService';
import { NotesService } from './notesService';
import geminiService from './gemini';
import { safeParseJsonResponse } from '../utils/aiResponseUtils';

export interface UserContext {
  userDocuments: string[];
  userNotes: string[];
  suggestedDocuments: any[];
  relatedNotes: any[];
  contextSummary: string;
}

export interface ContextDecision {
  useUserContext: boolean;
  includeDocuments: boolean;
  includeNotes: boolean;
  reason: string;
}

export class ContextManager {
  private workspaceService: WorkspaceService;
  private notesService: NotesService;

  constructor() {
    this.workspaceService = new WorkspaceService();
    this.notesService = new NotesService();
  }

  /**
   * Determine optimal context for a chat query
   */
  async determineOptimalContext(
    query: string,
    userId: string,
    chatHistory: any[] = []
  ): Promise<{
    publicContext: string[];
    userContext: UserContext;
    contextDecision: ContextDecision;
  }> {
    try {
      // Get user workspace settings
      const settings = await this.workspaceService.getUserWorkspaceSettings(userId);
      
      // If AI context is disabled, return empty user context
      if (!settings.ai_context_enabled) {
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

      // Analyze query relevance for user context
      const contextDecision = await this.analyzeQueryForUserContext(query, chatHistory);
      
      let userContext: UserContext = {
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
        publicContext: [], // Will be filled by existing retrieval system
        userContext,
        contextDecision
      };

    } catch (error) {
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
  private async analyzeQueryForUserContext(
    query: string,
    chatHistory: any[] = []
  ): Promise<ContextDecision> {
    try {
      // Keywords that suggest personal context might be relevant
      const personalKeywords = [
        'mein', 'meine', 'ich habe', 'wir haben', 'unser', 'unsere',
        'document', 'dokument', 'notiz', 'note', 'aufgeschrieben',
        'gespeichert', 'hochgeladen', 'datei', 'file'
      ];

      const hasPersonalKeywords = personalKeywords.some(keyword => 
        query.toLowerCase().includes(keyword.toLowerCase())
      );

      // Check if recent chat history mentions personal content
      const recentPersonalMentions = chatHistory.slice(-3).some(msg => 
        personalKeywords.some(keyword => 
          msg.content.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      // Use AI to determine if query benefits from personal context
      const aiAnalysis = await this.aiAnalyzeContextRelevance(query, chatHistory);

      const useUserContext = hasPersonalKeywords || recentPersonalMentions || aiAnalysis.relevant;
      
      return {
        useUserContext,
        includeDocuments: useUserContext && (aiAnalysis.documentsRelevant || hasPersonalKeywords),
        includeNotes: useUserContext && (aiAnalysis.notesRelevant || hasPersonalKeywords),
        reason: aiAnalysis.reason || 
          (hasPersonalKeywords ? 'Query contains personal keywords' : 
           recentPersonalMentions ? 'Recent conversation mentions personal content' : 
           'Query appears general, using public context only')
      };

    } catch (error) {
      console.error('Error analyzing query for user context:', error);
      return {
        useUserContext: false,
        includeDocuments: false,
        includeNotes: false,
        reason: 'Error analyzing context relevance'
      };
    }
  }

  /**
   * Use AI to analyze if query would benefit from personal context
   */
  private async aiAnalyzeContextRelevance(
    query: string,
    chatHistory: any[] = []
  ): Promise<{
    relevant: boolean;
    documentsRelevant: boolean;
    notesRelevant: boolean;
    reason: string;
  }> {
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

      const response = await geminiService.generateResponse(
        [{ role: 'user', content: prompt }],
        '',
        {},
        false
      );

      const analysis = safeParseJsonResponse(response);
      
      if (analysis) {
        return {
          relevant: analysis.relevant || false,
          documentsRelevant: analysis.documentsRelevant || false,
          notesRelevant: analysis.notesRelevant || false,
          reason: analysis.reason || 'AI analysis completed'
        };
      } else {
        return {
          relevant: false,
          documentsRelevant: false,
          notesRelevant: false,
          reason: 'Error parsing AI analysis'
        };
      }

    } catch (error) {
      console.error('Error in AI context analysis:', error);
      return {
        relevant: false,
        documentsRelevant: false,
        notesRelevant: false,
        reason: 'Error in AI analysis'
      };
    }
  }

  /**
   * Gather relevant user context based on query
   */
  private async gatherUserContext(
    userId: string,
    query: string,
    contextDecision: ContextDecision
  ): Promise<UserContext> {
    const userDocuments: string[] = [];
    const userNotes: string[] = [];
    let suggestedDocuments: any[] = [];
    let relatedNotes: any[] = [];

    try {
      // Search user's workspace if context is relevant
      if (contextDecision.includeDocuments || contextDecision.includeNotes) {
        const searchResults = await this.workspaceService.searchWorkspaceContent(
          userId,
          query,
          'all',
          10
        );

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
      const contextSummary = this.generateContextSummary(
        userDocuments.length,
        userNotes.length,
        contextDecision
      );

      return {
        userDocuments,
        userNotes,
        suggestedDocuments,
        relatedNotes,
        contextSummary
      };

    } catch (error) {
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
  private generateContextSummary(
    documentCount: number,
    noteCount: number,
    contextDecision: ContextDecision
  ): string {
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

  /**
   * Get user's workspace context settings
   */
  async getUserContextSettings(userId: string): Promise<{
    aiContextEnabled: boolean;
    autoTagEnabled: boolean;
    contextPreferences: any;
  }> {
    try {
      const settings = await this.workspaceService.getUserWorkspaceSettings(userId);
      
      return {
        aiContextEnabled: settings.ai_context_enabled,
        autoTagEnabled: settings.auto_tag_enabled,
        contextPreferences: settings.settings || {}
      };

    } catch (error) {
      console.error('Error getting user context settings:', error);
      return {
        aiContextEnabled: false,
        autoTagEnabled: false,
        contextPreferences: {}
      };
    }
  }
}

export default new ContextManager();
