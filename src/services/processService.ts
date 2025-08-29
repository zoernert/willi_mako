import { QdrantService } from './qdrant';
import llm from './llmProvider';

interface MermaidDiagram {
  id: string;
  title: string;
  content: string;
  mermaidCode: string;
  score: number;
  structuredData?: {
    process_steps: Array<{ id: string; label: string; shape?: string }>;
    connections: Array<{ from: string; to: string; label?: string }>;
  };
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
   * Generates structured process data from diagram metadata using LLM
   * This is a fallback for cases where migration is incomplete or data is malformed
   */
  static async generateStructuredDataFromMetadata(metadata: {
    id: string;
    title: string;
    content: string;
    mermaid_code?: string;
  }): Promise<{ process_steps: Array<{ id: string; label: string; shape?: string }>; connections: Array<{ from: string; to: string; label?: string }> }> {
    try {
      console.log(`🔄 Generating structured data for diagram: ${metadata.title} (ID: ${metadata.id})`);
      
      // Prepare context for the LLM
      const contextInfo = [
        `Titel: ${metadata.title}`,
        `Beschreibung: ${metadata.content}`,
        metadata.mermaid_code ? `Alter Mermaid-Code: ${metadata.mermaid_code}` : ''
      ].filter(Boolean).join('\n');

      const prompt = `Du bist ein Experte für Geschäftsprozesse in der Energiewirtschaft. Analysiere die folgenden Informationen über einen Prozess und erstelle daraus strukturierte JSON-Daten.

PROZESS-INFORMATIONEN:
${contextInfo}

AUFGABE:
Erstelle eine strukturierte JSON-Repräsentation dieses Prozesses mit folgender Struktur:

{
  "process_steps": [
    {"id": "eindeutige_id", "label": "Beschreibung des Schritts", "shape": "rectangle|diamond|round"}
  ],
  "connections": [
    {"from": "start_id", "to": "end_id", "label": "optional: Beschriftung"}
  ]
}

REGELN:
1. Verwende kurze, alphanumerische IDs ohne Leerzeichen (z.B. "step1", "decision_a", "end")
2. Die Labels sollen verständlich und auf Deutsch sein
3. Verwende "diamond" für Entscheidungen, "round" für Start/End, "rectangle" (oder weglassen) für normale Schritte
4. Erstelle mindestens 3-5 Schritte für einen vollständigen Prozess
5. Jeder Schritt sollte logisch mit dem nächsten verbunden sein
6. Wenn möglich, identifiziere Entscheidungspunkte und alternative Pfade

WICHTIG: Gib nur das JSON zurück, keine Erklärungen oder Markdown-Formatierung.

Beispiel-Output:
{
  "process_steps": [
    {"id": "start", "label": "Prozess startet", "shape": "round"},
    {"id": "check", "label": "Prüfung erforderlich?", "shape": "diamond"},
    {"id": "approve", "label": "Genehmigung erteilen"},
    {"id": "reject", "label": "Antrag ablehnen"},
    {"id": "end", "label": "Prozess beendet", "shape": "round"}
  ],
  "connections": [
    {"from": "start", "to": "check"},
    {"from": "check", "to": "approve", "label": "Ja"},
    {"from": "check", "to": "reject", "label": "Nein"},
    {"from": "approve", "to": "end"},
    {"from": "reject", "to": "end"}
  ]
}`;

      const response = await llm.generateText(prompt);
      
      if (response && response.trim()) {
        try {
          // Clean the response to ensure it's valid JSON
          const cleanedResponse = response
            .replace(/^```json\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim();
          
          const parsedData = JSON.parse(cleanedResponse);
          
          // Validate the structure
          if (parsedData.process_steps && Array.isArray(parsedData.process_steps) &&
              parsedData.connections && Array.isArray(parsedData.connections)) {
            
            // Basic validation of required fields
            const validSteps = parsedData.process_steps.every((step: any) => 
              step.id && step.label && typeof step.id === 'string' && typeof step.label === 'string'
            );
            
            const validConnections = parsedData.connections.every((conn: any) => 
              conn.from && conn.to && typeof conn.from === 'string' && typeof conn.to === 'string'
            );
            
            if (validSteps && validConnections) {
              console.log(`✅ Successfully generated structured data for diagram: ${metadata.title}`);
              return parsedData;
            } else {
              console.warn(`❌ Generated data validation failed for diagram: ${metadata.title}`);
            }
          } else {
            console.warn(`❌ Generated data has invalid structure for diagram: ${metadata.title}`);
          }
        } catch (parseError) {
          console.warn(`❌ Failed to parse LLM response as JSON for diagram: ${metadata.title}`, parseError);
        }
      } else {
        console.warn(`❌ LLM returned empty response for diagram: ${metadata.title}`);
      }
    } catch (error) {
      console.error(`❌ Error generating structured data for diagram: ${metadata.title}`, error);
    }
    
    // Fallback: Create a simple default structure
    console.log(`🔧 Using fallback structure for diagram: ${metadata.title}`);
    return {
      process_steps: [
        { id: "start", label: metadata.title || "Prozess", shape: "round" },
        { id: "info", label: "Details siehe Beschreibung" },
        { id: "end", label: "Prozess beendet", shape: "round" }
      ],
      connections: [
        { from: "start", to: "info" },
        { from: "info", to: "end" }
      ]
    };
  }

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

      // Transform results to our interface using the new structured data
      const diagrams: MermaidDiagram[] = await Promise.all(
        mermaidResults.map(async (result: any, index: number) => {
          let mermaidCode = 'graph TD\n    error[Keine Diagrammdaten gefunden];';

          // First priority: Use the new structured process_data
          if (result.payload?.process_data && typeof result.payload.process_data === 'object') {
            mermaidCode = this.generateMermaidFromStructuredData(result.payload.process_data);
            return {
              id: result.id?.toString() || `diagram_${index}`,
              title: result.payload?.context_text || `Prozessdiagramm ${index + 1}`,
              content: result.payload?.content || 'Keine Beschreibung verfügbar',
              mermaidCode: mermaidCode,
              score: result.score || 0,
              structuredData: result.payload.process_data, // Include structured data for frontend
            };
          } else {
            // Fallback: Generate structured data using LLM
            console.warn(`Migration incomplete or data malformed: No process_data found for diagram ID: ${result.id}`);
            console.log(`🔄 Attempting to generate structured data using LLM for diagram: ${result.payload?.context_text || result.id}`);
            
            try {
              const generatedData = await this.generateStructuredDataFromMetadata({
                id: result.id?.toString() || `diagram_${index}`,
                title: result.payload?.context_text || `Prozessdiagramm ${index + 1}`,
                content: result.payload?.content || 'Keine Beschreibung verfügbar',
                mermaid_code: result.payload?.mermaid_code || undefined
              });
              
              mermaidCode = this.generateMermaidFromStructuredData(generatedData);
              console.log(`✅ Successfully generated diagram from LLM for ID: ${result.id}`);
              
              return {
                id: result.id?.toString() || `diagram_${index}`,
                title: result.payload?.context_text || `Prozessdiagramm ${index + 1}`,
                content: result.payload?.content || 'Keine Beschreibung verfügbar',
                mermaidCode: mermaidCode,
                score: result.score || 0,
                structuredData: generatedData, // Include generated structured data for frontend
              };
            } catch (error) {
              console.error(`❌ Failed to generate structured data for diagram ID: ${result.id}`, error);
              mermaidCode = 'graph TD\n    error[Fehler beim Generieren der Diagrammdaten];';
              
              return {
                id: result.id?.toString() || `diagram_${index}`,
                title: result.payload?.context_text || `Prozessdiagramm ${index + 1}`,
                content: result.payload?.content || 'Keine Beschreibung verfügbar',
                mermaidCode: mermaidCode,
                score: result.score || 0,
              };
            }
          }
        })
      );

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
   * Generates a Mermaid diagram string from structured process data.
   * @param processData - The structured data with nodes and connections.
   * @returns A string containing the full Mermaid diagram code.
   */
  static generateMermaidFromStructuredData(processData: {
    process_steps: Array<{ id: string; label: string; shape?: string }>;
    connections: Array<{ from: string; to: string; label?: string }>;
  }): string {
    if (!processData || !processData.process_steps || !processData.connections) {
      console.warn('generateMermaidFromStructuredData: Invalid or incomplete process data provided.');
      return 'graph TD\n    error[Ungültige Prozessdaten];';
    }

    const { process_steps, connections } = processData;
    let mermaidCode = 'graph TD\n';

    // 1. Define all nodes (process steps)
    if (process_steps.length === 0) {
      return 'graph TD\n    info[Keine Prozessschritte definiert];';
    }
    
    process_steps.forEach(step => {
      // Sanitize label text for use in Mermaid string
      const label = step.label.replace(/"/g, '#quot;');
      let nodeDefinition;
      switch (step.shape) {
        case 'diamond':
          nodeDefinition = `${step.id}{"${label}"}`;
          break;
        case 'round':
          nodeDefinition = `${step.id}("${label}")`;
          break;
        default:
          nodeDefinition = `${step.id}["${label}"]`;
          break;
      }
      mermaidCode += `    ${nodeDefinition}\n`;
    });

    mermaidCode += '\n'; // Add a blank line for readability

    // 2. Define all connections
    connections.forEach(conn => {
      if (conn.label && conn.label.trim()) {
        // Use the simplest Mermaid syntax for labeled arrows: node1 -- text --> node2
        const label = conn.label.replace(/"/g, '').replace(/\|/g, '').trim();
        mermaidCode += `    ${conn.from} -- ${label} --> ${conn.to}\n`;
      } else {
        mermaidCode += `    ${conn.from} --> ${conn.to}\n`;
      }
    });

    return mermaidCode.trim();
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
Als Experten für Marktkommunikation in der Energiewirtschaft, analysiere die folgenden gefundenen Prozessdiagramme und erstelle eine verständliche Erklärung.

Benutzeranfrage: "${query}"

Gefundene Diagramme:
${diagramsInfo}

Erstelle eine prägnante Erklärung (2-3 Sätze), die:
1. Die Relevanz der gefundenen Prozesse für die Anfrage erklärt
2. Die wichtigsten Aspekte der dargestellten Abläufe zusammenfasst
3. Praktische Hinweise für die Anwendung gibt

Antwort auf Deutsch:`;

      const response = await llm.generateText(prompt);
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

      const response = await llm.generateText(prompt);
      
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
      
      const relatedDiagrams = await Promise.all(
        results
          .filter((result: any) => 
            result.payload?.type === 'mermaid_diagram' && 
            result.id?.toString() !== diagram.id
          )
          .map(async (result: any, index: number) => {
            let mermaidCode = 'graph TD\n    error[Keine Diagrammdaten gefunden];';

            // First priority: Use the new structured process_data
            if (result.payload?.process_data && typeof result.payload.process_data === 'object') {
              mermaidCode = this.generateMermaidFromStructuredData(result.payload.process_data);
            } else {
              // Fallback: Generate structured data using LLM
              console.warn(`Migration incomplete or data malformed: No process_data found for related diagram ID: ${result.id}`);
              
              try {
                const generatedData = await this.generateStructuredDataFromMetadata({
                  id: result.id?.toString() || `related_${index}`,
                  title: result.payload?.context_text || `Verwandter Prozess ${index + 1}`,
                  content: result.payload?.content || 'Keine Beschreibung verfügbar',
                  mermaid_code: result.payload?.mermaid_code || undefined
                });
                
                mermaidCode = this.generateMermaidFromStructuredData(generatedData);
              } catch (error) {
                console.error(`❌ Failed to generate structured data for related diagram ID: ${result.id}`, error);
                mermaidCode = 'graph TD\n    error[Fehler beim Generieren der Diagrammdaten];';
              }
            }

            return {
              id: result.id?.toString() || `related_${index}`,
              title: result.payload?.context_text || `Verwandter Prozess ${index + 1}`,
              content: result.payload?.content || 'Keine Beschreibung verfügbar',
              mermaidCode: mermaidCode,
              score: result.score || 0,
            };
          })
      );

      return relatedDiagrams;
    } catch (error) {
      console.error('Error finding related processes:', error);
      return [];
    }
  }
}

export default ProcessService;
export type { MermaidDiagram, ProcessSearchResult, ConversationMessage };
