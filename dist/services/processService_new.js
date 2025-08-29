"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessService = void 0;
const qdrant_1 = require("./qdrant");
const llmProvider_1 = __importDefault(require("./llmProvider"));
class ProcessService {
    /**
     * Searches for Mermaid diagrams in the Qdrant collection based on a natural language query
     */
    static async searchProcesses(request) {
        try {
            // Enhanced query with context from conversation
            const contextualQuery = this.buildContextualQuery(request.query, request.conversationHistory);
            // Search for Mermaid diagrams in Qdrant
            const searchResults = await qdrant_1.QdrantService.searchByText(contextualQuery, 10, 0.3);
            // Filter for Mermaid diagrams
            const mermaidResults = searchResults.filter((result) => { var _a; return ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.type) === 'mermaid_diagram'; });
            // Transform results to our interface
            const diagrams = mermaidResults.map((result, index) => {
                var _a, _b, _c, _d;
                return ({
                    id: ((_a = result.id) === null || _a === void 0 ? void 0 : _a.toString()) || `diagram_${index}`,
                    title: ((_b = result.payload) === null || _b === void 0 ? void 0 : _b.context_text) || `Prozessdiagramm ${index + 1}`,
                    content: ((_c = result.payload) === null || _c === void 0 ? void 0 : _c.content) || 'Keine Beschreibung verfügbar',
                    mermaidCode: ((_d = result.payload) === null || _d === void 0 ? void 0 : _d.mermaid_code) || '',
                    score: result.score || 0,
                });
            });
            // Generate process explanation using AI
            const textualExplanation = await this.generateProcessExplanation(request.query, diagrams);
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
     * Searches for processes with automatic Mermaid code improvement
     */
    static async searchProcessesWithImprovement(request) {
        try {
            console.log('ProcessService: Starting search with Mermaid improvement');
            // First get the basic results
            const basicResults = await this.searchProcesses(request);
            // Improve each Mermaid code
            const improvedDiagrams = await Promise.all(basicResults.diagrams.map(async (diagram) => {
                if (diagram.mermaidCode && diagram.mermaidCode.trim()) {
                    console.log(`ProcessService: Improving Mermaid code for diagram: ${diagram.title}`);
                    const improvedCode = await this.improveMermaidCode(diagram.mermaidCode, diagram.title);
                    return {
                        ...diagram,
                        mermaidCode: improvedCode
                    };
                }
                return diagram;
            }));
            console.log(`ProcessService: Improved ${improvedDiagrams.length} diagrams`);
            return {
                ...basicResults,
                diagrams: improvedDiagrams
            };
        }
        catch (error) {
            console.error('Error in ProcessService.searchProcessesWithImprovement:', error);
            throw new Error('Fehler bei der verbesserten Prozesssuche. Bitte versuchen Sie es erneut.');
        }
    }
    /**
     * Improves Mermaid code quality using LLM before rendering
     * Fixes syntax errors, improves readability, and ensures compatibility
     */
    static async improveMermaidCode(originalCode, context) {
        if (!originalCode || !originalCode.trim()) {
            return originalCode;
        }
        try {
            console.log('ProcessService: Starting Mermaid code improvement');
            console.log('Original code length:', originalCode.length);
            const prompt = `
Du bist ein Experte für Mermaid-Diagramm-Syntax. Analysiere den folgenden Mermaid-Code und verbessere ihn:

ORIGINAL CODE:
\`\`\`mermaid
${originalCode}
\`\`\`

KONTEXT: ${context || 'Allgemeiner Prozess'}

AUFGABEN:
1. Korrigiere alle Syntax-Fehler
2. Verbessere die Lesbarkeit
3. Stelle sicher, dass der Code valid Mermaid-Syntax ist
4. Behalte die ursprüngliche Bedeutung und Struktur bei
5. Verwende deutsche Labels und Beschreibungen
6. Optimiere für bessere Darstellung

REGELN:
- Verwende nur gültige Mermaid-Syntax (graph TD, flowchart, sequenceDiagram, etc.)
- Keine broken syntax wie "---" am Ende
- Verwende klare, deutsche Bezeichnungen
- Strukturiere Subgraphs logisch
- Nutze passende Pfeil-Typen und Node-Formen

Gib nur den verbesserten Mermaid-Code zurück, ohne zusätzliche Erklärungen oder Markdown-Blöcke:`;
            const improvedCode = await llmProvider_1.default.generateText(prompt);
            if (improvedCode && improvedCode.trim()) {
                // Clean the response to ensure it's just the code
                const cleanedCode = improvedCode
                    .replace(/^```mermaid\s*\n?/i, '')
                    .replace(/\n?```\s*$/i, '')
                    .trim();
                console.log('ProcessService: Mermaid code improved by LLM');
                console.log('Original length:', originalCode.length);
                console.log('Improved length:', cleanedCode.length);
                return cleanedCode;
            }
            else {
                console.warn('ProcessService: LLM did not return improved code, using original');
                return originalCode;
            }
        }
        catch (error) {
            console.error('Error improving Mermaid code with LLM:', error);
            return originalCode; // Fallback to original
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
            const response = await llmProvider_1.default.generateText(prompt);
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
            const response = await llmProvider_1.default.generateText(prompt);
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
     * Health check for the service
     */
    static async checkHealth() {
        return {
            status: 'OK',
            timestamp: new Date().toISOString()
        };
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
//# sourceMappingURL=processService_new.js.map