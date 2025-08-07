"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessService = void 0;
const qdrant_1 = require("./qdrant");
const gemini_1 = __importDefault(require("./gemini"));
class ProcessService {
    /**
     * Searches for Mermaid diagrams in the Qdrant collection based on a natural language query
     */
    static async searchProcesses(query, conversationHistory = []) {
        try {
            // Enhanced query with context from conversation
            const contextualQuery = this.buildContextualQuery(query, conversationHistory);
            // Search for Mermaid diagrams in Qdrant
            const searchResults = await qdrant_1.QdrantService.searchByText(contextualQuery, 10, 0.3);
            // Filter for Mermaid diagrams
            const mermaidResults = searchResults.filter((result) => { var _a; return ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.type) === 'mermaid_diagram'; });
            // Transform results to our interface
            const diagrams = await Promise.all(mermaidResults.map(async (result, index) => {
                var _a, _b, _c, _d;
                const originalCode = ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.mermaid_code) || '';
                const title = ((_b = result.payload) === null || _b === void 0 ? void 0 : _b.context_text) || `Prozessdiagramm ${index + 1}`;
                // Improve Mermaid code using LLM
                const improvedCodeResult = await this.improveMermaidCode(originalCode, title);
                return {
                    id: ((_c = result.id) === null || _c === void 0 ? void 0 : _c.toString()) || `diagram_${index}`,
                    title: title,
                    content: ((_d = result.payload) === null || _d === void 0 ? void 0 : _d.content) || 'Keine Beschreibung verfügbar',
                    mermaidCode: improvedCodeResult.improvedCode,
                    score: result.score || 0,
                };
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
        }
        catch (error) {
            console.error('Error in ProcessService.searchProcesses:', error);
            throw new Error('Fehler bei der Prozesssuche. Bitte versuchen Sie es erneut.');
        }
    }
    /**
     * Builds a contextual query by incorporating conversation history
     */
    static buildContextualQuery(query, conversationHistory) {
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
    static async generateProcessExplanation(query, diagrams) {
        if (diagrams.length === 0) {
            return 'Keine relevanten Prozessdiagramme gefunden. Versuchen Sie eine spezifischere Anfrage mit Begriffen aus der Marktkommunikation.';
        }
        try {
            const diagramsInfo = diagrams.map(d => `Titel: ${d.title}\nBeschreibung: ${d.content}\nRelevanz: ${Math.round(d.score * 100)}%`).join('\n\n');
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
            const response = await gemini_1.default.generateText(prompt);
            return response || 'Eine detaillierte Analyse der gefundenen Prozesse konnte nicht erstellt werden.';
        }
        catch (error) {
            console.error('Error generating process explanation:', error);
            return 'Die gefundenen Diagramme zeigen relevante Prozesse der Marktkommunikation. Eine detaillierte KI-Analyse ist momentan nicht verfügbar.';
        }
    }
    /**
     * Extracts key process steps from the found diagrams
     */
    static async extractProcessSteps(diagrams) {
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
            const response = await gemini_1.default.generateText(prompt);
            if (response) {
                return response
                    .split('\n')
                    .map(line => line.replace(/^[-*•]\s*/, '').trim())
                    .filter(line => line.length > 0)
                    .slice(0, 5);
            }
        }
        catch (error) {
            console.error('Error extracting process steps:', error);
        }
        // Fallback: Extract steps from diagram titles and content
        return diagrams.slice(0, 3).map(d => `${d.title}: ${d.content.substring(0, 50)}...`);
    }
    /**
     * Optimizes an existing process description based on user feedback
     */
    static async optimizeProcess(originalQuery, optimizationRequest, currentDiagrams) {
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
    static async findRelatedProcesses(diagram) {
        try {
            // Use the diagram's content as search query
            const relatedQuery = `${diagram.title} ${diagram.content}`;
            const results = await qdrant_1.QdrantService.searchByText(relatedQuery, 5, 0.4);
            const relatedDiagrams = results
                .filter((result) => {
                var _a, _b;
                return ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.type) === 'mermaid_diagram' &&
                    ((_b = result.id) === null || _b === void 0 ? void 0 : _b.toString()) !== diagram.id;
            })
                .map((result, index) => {
                var _a, _b, _c, _d;
                return ({
                    id: ((_a = result.id) === null || _a === void 0 ? void 0 : _a.toString()) || `related_${index}`,
                    title: ((_b = result.payload) === null || _b === void 0 ? void 0 : _b.context_text) || `Verwandter Prozess ${index + 1}`,
                    content: ((_c = result.payload) === null || _c === void 0 ? void 0 : _c.content) || 'Keine Beschreibung verfügbar',
                    mermaidCode: ((_d = result.payload) === null || _d === void 0 ? void 0 : _d.mermaid_code) || '',
                    score: result.score || 0,
                });
            });
            return relatedDiagrams;
        }
        catch (error) {
            console.error('Error finding related processes:', error);
            return [];
        }
    }
    /**
     * Improve Mermaid code using LLM
     */
    static async improveMermaidCode(originalCode, title, context) {
        try {
            console.log('ProcessService: Improving Mermaid code for:', title);
            // Basic validation first
            const validation = this.validateMermaidSyntax(originalCode);
            if (validation.isValid) {
                console.log('ProcessService: Code is already valid, returning as-is');
                return {
                    improvedCode: originalCode,
                    improvements: ['Code war bereits syntaktisch korrekt'],
                    valid: true,
                    confidence: 0.95
                };
            }
            // Create improvement prompt
            const improvementPrompt = `
Als Mermaid-Diagramm-Experte, verbessere bitte den folgenden Mermaid-Code:

TITEL: ${title || 'Unbekannt'}
KONTEXT: ${context || 'Kein Kontext verfügbar'}

ORIGINAL CODE:
\`\`\`mermaid
${originalCode}
\`\`\`

PROBLEME ERKANNT:
${validation.errors.join('\n- ')}

Bitte:
1. Korrigiere alle Syntax-Fehler
2. Verbessere die Lesbarkeit
3. Stelle sicher, dass alle Knoten und Verbindungen korrekt sind
4. Behalte die ursprüngliche Bedeutung und Struktur bei
5. Nutze moderne Mermaid-Syntax

Antworte NUR mit dem verbesserten Mermaid-Code in einem Code-Block.
`;
            const improvedResponse = await gemini_1.default.generateResponse(improvementPrompt);
            // Extract code from response
            const codeMatch = improvedResponse.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/);
            const improvedCode = codeMatch ? codeMatch[1].trim() : improvedResponse.trim();
            // Validate improved code
            const improvedValidation = this.validateMermaidSyntax(improvedCode);
            return {
                improvedCode,
                improvements: [
                    'LLM-basierte Syntax-Korrektur durchgeführt',
                    'Code-Struktur verbessert',
                    'Lesbarkeit optimiert'
                ],
                valid: improvedValidation.isValid,
                confidence: improvedValidation.isValid ? 0.85 : 0.4
            };
        }
        catch (error) {
            console.error('Error improving Mermaid code:', error);
            return {
                improvedCode: originalCode,
                improvements: ['Verbesserung fehlgeschlagen, Original-Code beibehalten'],
                valid: false,
                confidence: 0.1
            };
        }
    }
    /**
     * Validate Mermaid code and provide detailed feedback
     */
    static async validateMermaidCode(code) {
        try {
            const basicValidation = this.validateMermaidSyntax(code);
            // Enhanced validation with LLM
            if (!basicValidation.isValid) {
                const validationPrompt = `
Analysiere den folgenden Mermaid-Code und gib detailliertes Feedback:

\`\`\`mermaid
${code}
\`\`\`

Erkannte Probleme: ${basicValidation.errors.join(', ')}

Bitte antworte im JSON-Format:
{
  "errors": ["Liste der Fehler"],
  "warnings": ["Liste der Warnungen"],
  "suggestions": ["Verbesserungsvorschläge"]
}
`;
                try {
                    const validationResponse = await gemini_1.default.generateResponse(validationPrompt);
                    const feedback = JSON.parse(validationResponse);
                    return {
                        isValid: false,
                        errors: basicValidation.errors,
                        warnings: feedback.warnings || [],
                        suggestions: feedback.suggestions || []
                    };
                }
                catch (parseError) {
                    // Fallback to basic validation
                    return {
                        isValid: false,
                        errors: basicValidation.errors,
                        warnings: ['LLM-Validierung nicht verfügbar'],
                        suggestions: ['Überprüfen Sie die Mermaid-Syntax manuell']
                    };
                }
            }
            return {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: ['Code ist syntaktisch korrekt']
            };
        }
        catch (error) {
            console.error('Error validating Mermaid code:', error);
            return {
                isValid: false,
                errors: ['Validierung fehlgeschlagen'],
                warnings: [],
                suggestions: []
            };
        }
    }
    /**
     * Validates Mermaid code syntax
     */
    static validateMermaidCode(code) {
        const errors = [];
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
        const startsWithValidType = validTypes.some(type => cleaned.toLowerCase().startsWith(type.toLowerCase()));
        if (!startsWithValidType) {
            errors.push('Code startet nicht mit einem gültigen Mermaid-Diagramm-Typ');
        }
        // Check for common syntax issues
        if (cleaned.includes('---') && !cleaned.includes('sequenceDiagram')) {
            errors.push('Ungültige "---" Syntax (außerhalb von Sequence Diagrams)');
        }
        if (cleaned.length < 10) {
            errors.push('Code zu kurz für ein valides Mermaid-Diagramm');
        }
        // Check for unmatched brackets
        const openBrackets = (cleaned.match(/[\[\(]/g) || []).length;
        const closeBrackets = (cleaned.match(/[\]\)]/g) || []).length;
        if (openBrackets !== closeBrackets) {
            errors.push('Unausgeglichene Klammern im Code');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.ProcessService = ProcessService;
exports.default = ProcessService;
//# sourceMappingURL=processService_old.js.map