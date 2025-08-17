export = LLMDataExtractionService;
declare class LLMDataExtractionService {
    genAI: GoogleGenerativeAI;
    model: import("@google/generative-ai").GenerativeModel;
    pool: Pool;
    /**
     * Extrahiert strukturierte Daten aus einer E-Mail
     * @param {Object} email - E-Mail-Objekt mit subject, text, html, from
     * @param {string} teamId - ID des Teams für context-spezifische Extraktion
     * @returns {Promise<Object>} Extrahierte Daten
     */
    extractDataFromEmail(email: any, teamId: string): Promise<any>;
    /**
     * Erstellt einen strukturierten Prompt für die Datenextraktion
     */
    buildExtractionPrompt(email: any, teamContext: any): string;
    /**
     * Parst die LLM-Antwort in strukturierte Daten
     */
    parseExtractionResponse(response: any): {
        marktpartner: any;
        referenzen: any;
        klassifikation: any;
        inhalt: any;
        automatisierung: any;
        confidence: any;
        extractedAt: string;
        error?: undefined;
    } | {
        marktpartner: {};
        referenzen: {};
        klassifikation: {
            kategorie: string;
            priorität: string;
        };
        inhalt: {
            zusammenfassung: string;
        };
        automatisierung: {
            autoBearbeitung: boolean;
            standardAntwort: boolean;
        };
        confidence: number;
        extractedAt: string;
        error: any;
    };
    /**
     * Lädt Team-Kontext für bessere Extraktion
     */
    getTeamContext(teamId: any): Promise<{
        name: string;
        description?: undefined;
        responsibilities?: undefined;
        commonPartners?: undefined;
    } | {
        name: any;
        description: any;
        responsibilities: any;
        commonPartners: any;
    }>;
    /**
     * Generiert Cache-Schlüssel für E-Mail
     */
    generateCacheKey(email: any): string;
    /**
     * Lädt gecachte Extraktion
     */
    getCachedExtraction(cacheKey: any): Promise<any>;
    /**
     * Speichert Extraktion im Cache
     */
    cacheExtraction(cacheKey: any, extractedData: any, teamId: any): Promise<void>;
    /**
     * Analysiert E-Mail für automatische Weiterleitung
     */
    analyzeForRouting(email: any, extractedData: any): Promise<{
        suggestedTeam: string;
        confidence: any;
        reasoning: string;
    }>;
    /**
     * Schlägt Standardantworten vor
     */
    suggestStandardResponse(email: any, extractedData: any): Promise<{
        subject: string;
        body: string;
        confidence: number;
        suggestedAt: string;
    }>;
    /**
     * Generische LLM-Content-Generierung für verschiedene Features
     * @param {string} prompt - Der Prompt für das LLM
     * @param {Object} options - Optionale Konfiguration
     * @returns {Promise<string>} Generierter Content
     */
    generateContent(prompt: string, options?: any): Promise<string>;
    /**
     * Timeline-spezifische Aktivitätszusammenfassung
     * @param {string} featureType - Art des Features (chat, code_lookup, etc.)
     * @param {string} actionType - Art der Aktion
     * @param {Object} contextData - Kontextdaten der Aktivität
     * @returns {Promise<{title: string, summary: string}>} Titel und Zusammenfassung
     */
    generateTimelineActivitySummary(featureType: string, actionType: string, contextData: any): Promise<{
        title: string;
        summary: string;
    }>;
    /**
     * Erstellt detaillierte Timeline-spezifische Prompts basierend auf Aktivitätstyp
     */
    buildDetailedTimelinePrompt(activityType: any, rawData: any): string;
    /**
     * Generiert einen informativen Titel basierend auf dem Aktivitätstyp und Raw-Daten
     */
    generateTitleForActivityType(activityType: any, rawData: any): string;
    /**
     * Health Check für den Service
     */
    healthCheck(): Promise<{
        status: string;
        llm: string;
        database: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: any;
        timestamp: string;
        llm?: undefined;
        database?: undefined;
    }>;
}
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pool } from "pg";
//# sourceMappingURL=llmDataExtractionService.d.ts.map