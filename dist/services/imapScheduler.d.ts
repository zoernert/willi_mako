export = ImapScheduler;
declare class ImapScheduler {
    pool: Pool;
    imapService: ImapEmailService;
    llmService: LLMDataExtractionService;
    autoKlärfallService: AutoKlärfallService;
    isRunning: boolean;
    intervals: Map<any, any>;
    /**
     * Startet den IMAP-Scheduler für alle Teams
     */
    start(): Promise<void>;
    /**
     * Stoppt den IMAP-Scheduler
     */
    stop(): Promise<void>;
    /**
     * Startet die E-Mail-Überwachung für ein Team
     */
    startTeamMonitoring(team: any): Promise<void>;
    /**
     * Verarbeitet E-Mails für ein Team
     */
    processTeamEmails(team: any): Promise<void>;
    /**
     * Verarbeitet eine einzelne E-Mail
     */
    processEmail(email: any, teamId: any): Promise<void>;
    /**
     * Fügt E-Mail zur Verarbeitungsqueue hinzu
     */
    addToProcessingQueue(email: any, teamId: any): Promise<void>;
    /**
     * Lädt alle Teams mit E-Mail-Konfiguration
     */
    getTeamsWithEmailConfig(): Promise<any[]>;
    /**
     * Fügt ein neues Team zur Überwachung hinzu
     */
    addTeamMonitoring(teamId: any): Promise<void>;
    /**
     * Entfernt ein Team von der Überwachung
     */
    removeTeamMonitoring(teamId: any): Promise<void>;
    /**
     * Status des Schedulers abrufen
     */
    getStatus(): {
        isRunning: boolean;
        monitoredTeams: any[];
        totalTeams: number;
    };
}
import { Pool } from "pg";
import { ImapEmailService } from "./imapEmailService";
import LLMDataExtractionService = require("./llmDataExtractionService");
import AutoKlärfallService = require("./autoKl\u00E4rfallService");
//# sourceMappingURL=imapScheduler.d.ts.map