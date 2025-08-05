import { QdrantService } from './qdrant';
import geminiService from './gemini';

interface MermaidDiagram {
  id: string;
  title: string;
  content: string;
  mermaidCode: string;
  score: number;
}

interface ProcessSearchResult {
  diagrams: MermaidDiagram[];
  textualExplanation: string;
  processSteps: string[];
}

interface ConversationMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ProcessService {
  
  /**
   * Searches for Mermaid diagrams in the Qdrant collection based on a natural language query
   */
  static async searchProcesses(
    query: string, 
    conversationHistory: ConversationMessage[] = []
  ): Promise<ProcessSearchResult> {
    try {
      // Enhanced query with context from conversation
      const contextualQuery = this.buildContextualQuery(query, conversationHistory);
      
      // Search for Mermaid diagrams in Qdrant
      const searchResults = await QdrantService.searchByText(contextualQuery, 10, 0.3);
      
      // Filter for Mermaid diagrams
      const mermaidResults = searchResults.filter((result: any) => 
        result.payload?.type === 'mermaid_diagram'
      );

      // Transform results to our interface
      const diagrams: MermaidDiagram[] = mermaidResults.map((result: any, index: number) => ({
        id: result.id?.toString() || `diagram_${index}`,
        title: result.payload?.context_text || `Prozessdiagramm ${index + 1}`,
        content: result.payload?.content || 'Keine Beschreibung verfügbar',
        mermaidCode: result.payload?.mermaid_code || '',
        score: result.score || 0,
      }));

      // Generate process explanation using AI
      const textualExplanation = await this.generateProcessExplanation(query, diagrams);
      
      // Extract process steps
      const processSteps = await this.extractProcessSteps(diagrams);

      return {
        diagrams,
        textualExplanation,
        processSteps,
      };
    } catch (error) {
      console.error('Error in ProcessService.searchProcesses:', error);
      throw new Error('Fehler bei der Prozesssuche. Bitte versuchen Sie es erneut.');
    }
  }

  /**
   * Builds a contextual query by incorporating conversation history
   */
  private static buildContextualQuery(query: string, conversationHistory: ConversationMessage[]): string {
    if (conversationHistory.length === 0) {
      return query;
    }

    // Get last few messages for context
    const recentMessages = conversationHistory.slice(-3);
    const context = recentMessages
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n');

    return `${context}\n\nAktuelle Anfrage: ${query}`;
  }

  /**
   * Generates a comprehensive explanation of the found processes using AI
   */
  private static async generateProcessExplanation(
    query: string, 
    diagrams: MermaidDiagram[]
  ): Promise<string> {
    if (diagrams.length === 0) {
      return 'Keine relevanten Prozessdiagramme gefunden. Versuchen Sie eine spezifischere Anfrage mit Begriffen aus der Marktkommunikation.';
    }

    try {
      const diagramsInfo = diagrams.map(d => 
        `Titel: ${d.title}\nBeschreibung: ${d.content}\nRelevanz: ${Math.round(d.score * 100)}%`
      ).join('\n\n');

      const prompt = `
Als Experte für Marktkommunikation in der Energiewirtschaft, analysiere die folgenden gefundenen Prozessdiagramme und erstelle eine verständliche Erklärung.

Benutzeranfrage: "${query}"

Gefundene Diagramme:
${diagramsInfo}

Erstelle eine prägnante Erklärung (2-3 Sätze), die:
1. Die Relevanz der gefundenen Prozesse für die Anfrage erklärt
2. Die wichtigsten Aspekte der dargestellten Abläufe zusammenfasst
3. Praktische Hinweise für die Anwendung gibt

Antwort auf Deutsch:`;

      const response = await geminiService.generateText(prompt);
      return response || 'Eine detaillierte Analyse der gefundenen Prozesse konnte nicht erstellt werden.';
    } catch (error) {
      console.error('Error generating process explanation:', error);
      return 'Die gefundenen Diagramme zeigen relevante Prozesse der Marktkommunikation. Eine detaillierte KI-Analyse ist momentan nicht verfügbar.';
    }
  }

  /**
   * Extracts key process steps from the found diagrams
   */
  private static async extractProcessSteps(diagrams: MermaidDiagram[]): Promise<string[]> {
    if (diagrams.length === 0) {
      return [];
    }

    try {
      const allContent = diagrams.map(d => d.content).join('\n');
      
      const prompt = `
Analysiere den folgenden Text über Energiewirtschafts-Prozesse und extrahiere die 5 wichtigsten Prozessschritte oder Erkenntnisse:

${allContent}

Erstelle eine Liste von maximal 5 prägnanten Stichpunkten, die die wichtigsten Schritte oder Aspekte zusammenfassen.
Jeder Punkt sollte maximal 15 Wörter haben.
Verwende Fachbegriffe der Energiewirtschaft korrekt.

Format: Einfache Liste ohne Nummerierung.`;

      const response = await geminiService.generateText(prompt);
      
      if (response) {
        return response
          .split('\n')
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 5);
      }
    } catch (error) {
      console.error('Error extracting process steps:', error);
    }

    // Fallback: Extract steps from diagram titles and content
    return diagrams.slice(0, 3).map(d => 
      `${d.title}: ${d.content.substring(0, 50)}...`
    );
  }

  /**
   * Optimizes an existing process description based on user feedback
   */
  static async optimizeProcess(
    originalQuery: string,
    optimizationRequest: string,
    currentDiagrams: MermaidDiagram[]
  ): Promise<ProcessSearchResult> {
    const combinedQuery = `
    Ursprüngliche Anfrage: ${originalQuery}
    Optimierungsanfrage: ${optimizationRequest}
    
    Verbessere oder erweitere die Prozesssuche basierend auf der Optimierungsanfrage.
    `;

    return this.searchProcesses(combinedQuery);
  }

  /**
   * Searches for related processes based on a specific diagram
   */
  static async findRelatedProcesses(diagram: MermaidDiagram): Promise<MermaidDiagram[]> {
    try {
      // Use the diagram's content as search query
      const relatedQuery = `${diagram.title} ${diagram.content}`;
      const results = await QdrantService.searchByText(relatedQuery, 5, 0.4);
      
      const relatedDiagrams = results
        .filter((result: any) => 
          result.payload?.type === 'mermaid_diagram' && 
          result.id?.toString() !== diagram.id
        )
        .map((result: any, index: number) => ({
          id: result.id?.toString() || `related_${index}`,
          title: result.payload?.context_text || `Verwandter Prozess ${index + 1}`,
          content: result.payload?.content || 'Keine Beschreibung verfügbar',
          mermaidCode: result.payload?.mermaid_code || '',
          score: result.score || 0,
        }));

      return relatedDiagrams;
    } catch (error) {
      console.error('Error finding related processes:', error);
      return [];
    }
  }
}

export default ProcessService;
