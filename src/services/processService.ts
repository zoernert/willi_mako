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
  static async searchProcesses(request: {
    query: string;
    conversationHistory?: ConversationMessage[];
  }): Promise<ProcessSearchResult> {
    try {
      // Enhanced query with context from conversation
      const contextualQuery = this.buildContextualQuery(request.query, request.conversationHistory || []);
      
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
      const textualExplanation = await this.generateProcessExplanation(request.query, diagrams);
      
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
   * Searches for processes with automatic Mermaid code improvement
   */
  static async searchProcessesWithImprovement(request: {
    query: string;
    conversationHistory: ConversationMessage[];
  }): Promise<ProcessSearchResult> {
    try {
      console.log('ProcessService: Starting search with Mermaid improvement');
      
      // First get the basic results
      const basicResults = await this.searchProcesses(request);
      
      // Improve each Mermaid code
      const improvedDiagrams = await Promise.all(
        basicResults.diagrams.map(async (diagram) => {
          if (diagram.mermaidCode && diagram.mermaidCode.trim()) {
            console.log(`ProcessService: Improving Mermaid code for diagram: ${diagram.title}`);
            const improvedCode = await this.improveMermaidCode(diagram.mermaidCode, diagram.title);
            return {
              ...diagram,
              mermaidCode: improvedCode
            };
          }
          return diagram;
        })
      );

      console.log(`ProcessService: Improved ${improvedDiagrams.length} diagrams`);

      return {
        ...basicResults,
        diagrams: improvedDiagrams
      };
    } catch (error) {
      console.error('Error in ProcessService.searchProcessesWithImprovement:', error);
      throw new Error('Fehler bei der verbesserten Prozesssuche. Bitte versuchen Sie es erneut.');
    }
  }

  /**
   * Improves Mermaid code quality using LLM before rendering
   * Fixes syntax errors, improves readability, and ensures compatibility
   */
  static async improveMermaidCode(originalCode: string, context?: string): Promise<string> {
    if (!originalCode || !originalCode.trim()) {
      return originalCode;
    }

    try {
      console.log('ProcessService: Starting Mermaid code improvement');
      console.log('Original code length:', originalCode.length);

      // First, clean the code to remove obvious issues
      const cleanedCode = this.cleanMermaidCode(originalCode);
      console.log('ProcessService: Code cleaned, length:', cleanedCode.length);

      // Validate the cleaned code
      const validation = this.validateMermaidCode(cleanedCode);
      if (validation.isValid) {
        console.log('ProcessService: Code is valid after cleaning, skipping LLM improvement');
        return cleanedCode;
      } else {
        console.log('ProcessService: Code still has issues after cleaning:', validation.errors);
      }

      const prompt = `
Du bist ein Experte für Mermaid-Diagramm-Syntax. Analysiere den folgenden Mermaid-Code und verbessere ihn:

ORIGINAL CODE:
\`\`\`mermaid
${cleanedCode}
\`\`\`

KONTEXT: ${context || 'Allgemeiner Prozess'}

BEKANNTE PROBLEME:
${validation.errors.map(error => `- ${error}`).join('\n')}

AUFGABEN:
1. Korrigiere alle Syntax-Fehler
2. Entferne HTML-Tags wie <br>, <div>, etc.
3. Verbessere die Lesbarkeit
4. Stelle sicher, dass der Code valid Mermaid-Syntax ist
5. Behalte die ursprüngliche Bedeutung und Struktur bei
6. Verwende deutsche Labels und Beschreibungen
7. Optimiere für bessere Darstellung

REGELN:
- Verwende nur gültige Mermaid-Syntax (graph TD, flowchart, sequenceDiagram, etc.)
- Keine HTML-Tags in Node-Labels
- Keine broken syntax wie "---" am Ende
- Verwende klare, deutsche Bezeichnungen
- Strukturiere Subgraphs logisch
- Nutze passende Pfeil-Typen und Node-Formen
- Escape special characters in node labels properly

Gib nur den verbesserten Mermaid-Code zurück, ohne zusätzliche Erklärungen oder Markdown-Blöcke:`;

      const improvedCode = await geminiService.generateText(prompt);
      
      if (improvedCode && improvedCode.trim()) {
        // Clean the response to ensure it's just the code
        const finalCode = this.cleanMermaidCode(improvedCode);
        
        // Validate the improved code
        const finalValidation = this.validateMermaidCode(finalCode);
        if (finalValidation.isValid) {
          console.log('ProcessService: Mermaid code successfully improved by LLM');
          console.log('Original length:', originalCode.length);
          console.log('Final length:', finalCode.length);
          return finalCode;
        } else {
          console.warn('ProcessService: LLM improved code still has issues:', finalValidation.errors);
          return cleanedCode; // Return cleaned version instead of invalid improved version
        }
      } else {
        console.warn('ProcessService: LLM did not return improved code, using cleaned version');
        return cleanedCode;
      }
    } catch (error) {
      console.error('Error improving Mermaid code with LLM:', error);
      return this.cleanMermaidCode(originalCode); // Fallback to cleaned original
    }
  }

  /**
   * Builds a contextual query by incorporating conversation history
   */
  private static buildContextualQuery(query: string, conversationHistory: ConversationMessage[] = []): string {
    if (!conversationHistory || conversationHistory.length === 0) {
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
   * Health check for the service
   */
  static async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates Mermaid code syntax
   */
  static validateMermaidCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!code || !code.trim()) {
      errors.push('Leerer Mermaid-Code');
      return { isValid: false, errors };
    }

    const cleaned = code
      .replace(/^```mermaid\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Check for valid diagram types
    const validTypes = [
      'graph', 'flowchart', 'sequenceDiagram', 'sequencediagram',
      'classDiagram', 'classdiagram', 'erDiagram', 'erdiagram',
      'journey', 'gantt', 'pie', 'gitgraph', 'mindmap', 'timeline'
    ];
    
    const startsWithValidType = validTypes.some(type => 
      cleaned.toLowerCase().startsWith(type.toLowerCase())
    );
    
    if (!startsWithValidType) {
      errors.push('Code startet nicht mit einem gültigen Mermaid-Diagramm-Typ');
    }

    // Check for problematic HTML tags that break Mermaid parsing
    if (cleaned.includes('<br>') || cleaned.includes('<BR>')) {
      errors.push('HTML Line-Break Tags (<br>) sind in Mermaid nicht erlaubt');
    }

    if (cleaned.includes('<div>') || cleaned.includes('<span>')) {
      errors.push('HTML Block-Tags sind in Mermaid nicht erlaubt');
    }

    // Check for common syntax issues
    if (cleaned.includes('---') && !cleaned.includes('sequenceDiagram')) {
      errors.push('Ungültige "---" Syntax (außerhalb von Sequence Diagrams)');
    }

    if (cleaned.length < 10) {
      errors.push('Code zu kurz für ein valides Mermaid-Diagramm');
    }

    // Check for unmatched brackets (including different types)
    const openSquare = (cleaned.match(/\[/g) || []).length;
    const closeSquare = (cleaned.match(/\]/g) || []).length;
    const openParen = (cleaned.match(/\(/g) || []).length;
    const closeParen = (cleaned.match(/\)/g) || []).length;
    const openBrace = (cleaned.match(/\{/g) || []).length;
    const closeBrace = (cleaned.match(/\}/g) || []).length;

    if (openSquare !== closeSquare) {
      errors.push('Unausgeglichene eckige Klammern [] im Code');
    }
    if (openParen !== closeParen) {
      errors.push('Unausgeglichene runde Klammern () im Code');
    }
    if (openBrace !== closeBrace) {
      errors.push('Unausgeglichene geschweifte Klammern {} im Code');
    }

    // Check for empty node definitions
    if (cleaned.match(/\[\s*\]/)) {
      errors.push('Leere Node-Definitionen [] gefunden');
    }

    // Check for invalid characters in node IDs
    const nodeIdRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    const lines = cleaned.split('\n');
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('%')) {
        // Check if line contains invalid syntax patterns
        if (trimmedLine.includes('>>') && !trimmedLine.includes('-->')) {
          errors.push(`Zeile ${index + 1}: Ungültige Pfeil-Syntax ">>" gefunden`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Optimizes an existing process description based on user feedback
   */
  static async optimizeProcess(request: {
    originalQuery: string;
    optimizationRequest: string;
    currentDiagrams?: MermaidDiagram[];
  }): Promise<ProcessSearchResult> {
    const combinedQuery = `
    Ursprüngliche Anfrage: ${request.originalQuery}
    Optimierungsanfrage: ${request.optimizationRequest}
    
    Verbessere oder erweitere die Prozesssuche basierend auf der Optimierungsanfrage.
    `;

    return this.searchProcesses({
      query: combinedQuery,
      conversationHistory: []
    });
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

  /**
   * Cleans and fixes common Mermaid code issues
   */
  static cleanMermaidCode(code: string): string {
    if (!code || !code.trim()) {
      return code;
    }

    let cleaned = code
      .replace(/^```mermaid\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Remove problematic HTML tags
    cleaned = cleaned
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<div[^>]*>/gi, ' ')
      .replace(/<\/div>/gi, ' ')
      .replace(/<span[^>]*>/gi, ' ')
      .replace(/<\/span>/gi, ' ')
      .replace(/<p[^>]*>/gi, ' ')
      .replace(/<\/p>/gi, ' ');

    // Clean up whitespace and line breaks
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Fix common syntax issues
    cleaned = cleaned
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\{\s+/g, '{')
      .replace(/\s+\}/g, '}');

    // Ensure proper line breaks for readability
    const lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return lines.join('\n');
  }
}

export default ProcessService;
export type { MermaidDiagram, ProcessSearchResult, ConversationMessage };
