export = AutoKlärfallService;
declare class AutoKlärfallService {
    pool: Pool;
    llmService: any;
    /**
     * Erstellt automatisch einen Klärfall basierend auf E-Mail und LLM-Extraktion
     * @param {Object} email - E-Mail-Objekt
     * @param {Object} extractedData - Von LLM extrahierte Daten
     * @param {string} teamId - Team-ID
     * @returns {Promise<Object>} Erstellter Klärfall
     */
    createClarificationFromEmail(email: any, extractedData: any, teamId: string): Promise<any>;
    /**
     * Findet existierenden Marktpartner oder erstellt neuen
     */
    findOrCreateMarketPartner(partnerData: any, client: any): Promise<any>;
    /**
     * Erstellt den Basis-Klärfall
     */
    createBaseClarification(email: any, extractedData: any, teamId: any, partnerId: any, client: any): Promise<any>;
    /**
     * Verknüpft extrahierte Referenzen mit dem Klärfall
     */
    linkReferences(clarificationId: any, references: any, client: any): Promise<void>;
    /**
     * Speichert LLM-Extraktion für späteren Zugriff
     */
    saveLLMExtraction(clarificationId: any, extractedData: any, client: any): Promise<void>;
    /**
     * Führt automatische Aktionen basierend auf LLM-Analyse aus
     */
    executeAutomaticActions(clarification: any, extractedData: any, client: any): Promise<void>;
    /**
     * Weist Klärfall automatisch einem Spezialisten zu
     */
    assignToSpecialist(clarification: any, extractedData: any, client: any): Promise<void>;
    /**
     * Speichert Antwort-Entwurf
     */
    saveDraftResponse(clarificationId: any, response: any, client: any): Promise<void>;
    /**
     * Erstellt Bulk-Klärfall für Listen-E-Mails
     */
    createBulkClarification(email: any, listItems: any, extractedData: any, teamId: any): Promise<any>;
    /**
     * Utility-Funktionen für Mapping und Generierung
     */
    generateTitle(subject: any, extractedData: any): string;
    generateDescription(email: any, extractedData: any): string;
    mapCategory(category: any): any;
    mapPriority(priority: any): any;
    mapEffort(effort: any): any;
    determineClarificationType(extractedData: any): "intern" | "bilateral";
    determineInitialStatus(extractedData: any): "in_bearbeitung" | "offen";
    logActivity(clarificationId: any, activityType: any, description: any, client: any): Promise<void>;
    sendNotifications(clarification: any, extractedData: any): Promise<void>;
    scheduleFollowUp(clarification: any, extractedData: any, client: any): Promise<void>;
    /**
     * Health Check für den Service
     */
    healthCheck(): Promise<{
        status: string;
        database: string;
        llmService: any;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: any;
        timestamp: string;
        database?: undefined;
        llmService?: undefined;
    }>;
}
import { Pool } from "pg";
//# sourceMappingURL=autoKl%C3%A4rfallService.d.ts.map