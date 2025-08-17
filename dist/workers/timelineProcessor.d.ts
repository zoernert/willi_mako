declare class TimelineProcessor {
    private db;
    private llmService;
    private isProcessing;
    private processingInterval;
    constructor();
    /**
     * Startet den Background Worker
     */
    start(): void;
    /**
     * Stoppt den Background Worker
     */
    stop(): void;
    /**
     * Verarbeitet alle ausstehenden Queue-Einträge
     */
    private processQueue;
    /**
     * Holt ausstehende Queue-Einträge aus der Datenbank
     */
    private getQueueEntries;
    /**
     * Verarbeitet einen einzelnen Queue-Eintrag
     */
    private processEntry;
    /**
     * Generiert eine KI-Zusammenfassung für eine Aktivität
     */
    private generateSummary;
    /**
     * Erstellt den entsprechenden Prompt basierend auf dem Aktivitätstyp
     */
    private buildPromptForActivityType;
    /**
     * Erstellt eine Timeline-Aktivität in der Datenbank
     */
    private createTimelineActivity;
    /**
     * Generiert einen Titel basierend auf dem Aktivitätstyp
     */
    private generateTitleForActivityType;
    /**
     * Behandelt Verarbeitungsfehler
     */
    private handleProcessingError;
    /**
     * Aktualisiert den Status eines Queue-Eintrags
     */
    private updateQueueStatus;
    /**
     * Entfernt einen erfolgreich verarbeiteten Eintrag aus der Queue
     */
    private removeFromQueue;
    /**
     * Gibt Statistiken über die Queue zurück
     */
    getQueueStats(): Promise<any>;
    /**
     * Bereinigt alte verarbeitete Einträge (aufräumen)
     */
    cleanup(): Promise<void>;
}
export declare const timelineProcessor: TimelineProcessor;
export {};
//# sourceMappingURL=timelineProcessor.d.ts.map