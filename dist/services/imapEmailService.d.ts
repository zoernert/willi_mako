export class ImapEmailService {
    /**
     * Verschlüsselt Passwort für Speicherung
     */
    static encryptPassword(password: any): string;
    pool: Pool;
    activeConnections: Map<any, any>;
    processignInterval: NodeJS.Timeout;
    llmService: any;
    autoKlärfallService: AutoKlärfallService;
    /**
     * Startet die IMAP-Überwachung für alle konfigurierten Teams
     */
    startMonitoring(): Promise<void>;
    /**
     * Stoppt die IMAP-Überwachung
     */
    stopMonitoring(): Promise<void>;
    /**
     * Lädt alle Teams mit E-Mail-Konfiguration
     */
    getConfiguredTeams(): Promise<any[]>;
    /**
     * Startet IMAP-Überwachung für ein spezifisches Team
     */
    startTeamMonitoring(teamConfig: any): Promise<void>;
    /**
     * Öffnet das INBOX und überwacht neue E-Mails
     */
    openInbox(imap: any, teamConfig: any): void;
    /**
     * Verarbeitet ungelesene E-Mails
     */
    processUnreadEmails(imap: any, teamConfig: any, box: any): Promise<any>;
    /**
     * Verarbeitet eine einzelne E-Mail-Nachricht
     */
    processEmailMessage(msg: any, seqno: any, teamConfig: any): Promise<void>;
    /**
     * Fügt E-Mail zur Verarbeitungsqueue hinzu
     */
    queueEmailForProcessing(teamId: any, emailData: any): Promise<void>;
    /**
     * Verarbeitet E-Mails aus der Queue
     */
    processQueuedEmails(): Promise<void>;
    /**
     * Verarbeitet eine einzelne E-Mail aus der Queue
     */
    processQueuedEmail(queueId: any): Promise<void>;
    /**
     * Prüft ob E-Mail für Klärfall-Erstellung geeignet ist
     */
    shouldCreateClarification(emailData: any, extractedData: any): boolean;
    /**
     * Aktualisiert den Status einer E-Mail in der Queue
     */
    updateQueueStatus(queueId: any, status: any, errorMessage?: any): Promise<void>;
    /**
     * Aktualisiert die letzte verarbeitete UID für ein Team
     */
    updateLastProcessedUid(teamId: any, uid: any): Promise<void>;
    /**
     * Entschlüsselt Passwort (vereinfacht - in Produktion sollte echte Verschlüsselung verwendet werden)
     */
    decryptPassword(encryptedPassword: any): Promise<string>;
    /**
     * Behandelt Verbindungsfehler
     */
    handleConnectionError(teamId: any, error: any): Promise<void>;
    /**
     * Gesundheitsstatus der IMAP-Verbindungen
     */
    getHealthStatus(): {
        activeConnections: number;
        isMonitoring: boolean;
        connections: any[];
    };
}
import { Pool } from "pg";
import AutoKlärfallService = require("./autoKl\u00E4rfallService");
//# sourceMappingURL=imapEmailService.d.ts.map