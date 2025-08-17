"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineProcessor = void 0;
// Use central LLM service instead of direct Gemini integration
const LLMDataExtractionService = require('../services/llmDataExtractionService.js');
const logger_1 = require("../lib/logger");
const database_1 = __importDefault(require("../config/database"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Stelle sicher, dass .env geladen wird mit korrektem Pfad
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
class TimelineProcessor {
    constructor() {
        this.isProcessing = false;
        this.processingInterval = null;
        this.db = database_1.default; // Verwende die bereits konfigurierte Pool-Instanz
        this.llmService = new LLMDataExtractionService();
    }
    /**
     * Startet den Background Worker
     */
    start() {
        if (this.processingInterval) {
            logger_1.logger.warn('Timeline processor is already running');
            return;
        }
        logger_1.logger.info('Starting timeline processor...');
        // Verarbeite Queue alle 30 Sekunden
        this.processingInterval = setInterval(() => {
            this.processQueue().catch(error => {
                logger_1.logger.error('Error in timeline processing interval:', error);
            });
        }, 30000);
        // Einmalige Verarbeitung beim Start
        this.processQueue().catch(error => {
            logger_1.logger.error('Error in initial timeline processing:', error);
        });
    }
    /**
     * Stoppt den Background Worker
     */
    stop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
            logger_1.logger.info('Timeline processor stopped');
        }
    }
    /**
     * Verarbeitet alle ausstehenden Queue-Einträge
     */
    async processQueue() {
        if (this.isProcessing) {
            logger_1.logger.debug('Timeline processing already in progress, skipping');
            return;
        }
        this.isProcessing = true;
        try {
            const queueEntries = await this.getQueueEntries();
            if (queueEntries.length === 0) {
                logger_1.logger.debug('No timeline queue entries to process');
                return;
            }
            logger_1.logger.info(`Processing ${queueEntries.length} timeline queue entries`);
            for (const entry of queueEntries) {
                try {
                    await this.processEntry(entry);
                }
                catch (error) {
                    logger_1.logger.error(`Error processing timeline entry ${entry.id}:`, error);
                    await this.handleProcessingError(entry, error);
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Holt ausstehende Queue-Einträge aus der Datenbank
     */
    async getQueueEntries() {
        const query = `
      SELECT 
        tpq.id, 
        tpq.activity_id,
        ta.timeline_id,
        tpq.raw_data, 
        ta.activity_type, 
        tpq.created_at, 
        tpq.retry_count
      FROM timeline_processing_queue tpq
      JOIN timeline_activities ta ON tpq.activity_id = ta.id
      WHERE tpq.status = 'queued'
        AND tpq.retry_count < 3
      ORDER BY tpq.created_at ASC
      LIMIT 10
    `;
        const result = await this.db.query(query);
        return result.rows;
    }
    /**
     * Verarbeitet einen einzelnen Queue-Eintrag
     */
    async processEntry(entry) {
        logger_1.logger.debug(`Processing timeline entry ${entry.id} for activity ${entry.activity_id}`);
        // Markiere als in Bearbeitung
        await this.updateQueueStatus(entry.id, 'processing');
        try {
            const result = await this.generateSummary(entry);
            if (result.success && result.summary) {
                // Aktualisiere Timeline-Aktivität mit der generierten Zusammenfassung
                await this.createTimelineActivity(entry, result.summary);
                // Markiere Queue-Eintrag als abgeschlossen und entferne ihn
                await this.updateQueueStatus(entry.id, 'completed');
                await this.removeFromQueue(entry.id);
                logger_1.logger.info(`Successfully processed timeline entry ${entry.id} for activity ${entry.activity_id}`);
            }
            else {
                throw new Error(result.error || 'Failed to generate summary');
            }
        }
        catch (error) {
            await this.handleProcessingError(entry, error);
            throw error;
        }
    }
    /**
     * Generiert eine KI-Zusammenfassung für eine Aktivität
     */
    async generateSummary(entry) {
        var _a, _b;
        try {
            // Use central LLM service for timeline activity summary generation
            const result = await this.llmService.generateTimelineActivitySummary(entry.raw_data.feature || 'unknown', entry.activity_type, entry.raw_data);
            if (!result.summary || result.summary.trim().length === 0) {
                return {
                    success: false,
                    error: 'Empty summary generated'
                };
            }
            return {
                success: true,
                summary: result.summary.trim()
            };
        }
        catch (error) {
            logger_1.logger.error(`Error generating summary for entry ${entry.id}:`, error);
            // Rate limiting handling
            if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('quota')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('rate'))) {
                return {
                    success: false,
                    error: 'Rate limit exceeded'
                };
            }
            return {
                success: false,
                error: error.message || 'Unknown error during summary generation'
            };
        }
    }
    /**
     * Erstellt den entsprechenden Prompt basierend auf dem Aktivitätstyp
     */
    buildPromptForActivityType(activityType, rawData) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const basePrompt = `Du bist ein KI-Assistent für die Marktkommunikation in der Energiewirtschaft. 
Erstelle eine prägnante, professionelle Zusammenfassung (max. 200 Wörter) der folgenden Aktivität für die Timeline-Dokumentation.

Fokussiere dich auf:
- Wichtige Erkenntnisse und Entscheidungen
- Relevante Marktpartner oder Codes
- Nächste Schritte oder offene Punkte
- Geschäftskritische Informationen

Aktivitätstyp: ${activityType}
`;
        switch (activityType) {
            case 'message':
            case 'chat_message':
                return `${basePrompt}

Chat-Nachricht Kontext:
- Chat-Titel: ${rawData.chatTitle || 'Keine Bezeichnung'}
- Benutzer-Nachricht: ${rawData.userMessage || 'Keine Nachricht'}
- Assistent-Antwort: ${((_a = rawData.assistantMessage) === null || _a === void 0 ? void 0 : _a.substring(0, 500)) + (((_b = rawData.assistantMessage) === null || _b === void 0 ? void 0 : _b.length) > 500 ? '...' : '') || 'Keine Antwort'}
- Nachrichtentyp: ${rawData.messageType || 'normal'}
- Zeitstempel: ${rawData.timestamp || 'unbekannt'}
- Kontext-Einstellungen: ${rawData.contextSettings ? JSON.stringify(rawData.contextSettings, null, 2) : 'Standard'}

Erstelle eine prägnante Zusammenfassung dieser Chat-Interaktion. Fokussiere dich auf:
1. Das Hauptthema der Unterhaltung
2. Die wichtigsten behandelten Punkte oder Nachrichtenformate
3. Relevante Erkenntnisse für die Marktkommunikation
4. Handlungsempfehlungen oder nächste Schritte (falls erkennbar)`;
            case 'chat_session':
                return `${basePrompt}

Chat-Session Daten:
- Chat-Titel: ${rawData.chatTitle || 'Keine Bezeichnung'}
- Anzahl Nachrichten: ${rawData.message_count || 'unbekannt'}
- Dauer: ${rawData.duration || 'unbekannt'}
- Hauptthemen: ${((_c = rawData.topics) === null || _c === void 0 ? void 0 : _c.join(', ')) || 'keine spezifiziert'}
- Letzter Kontext: ${rawData.last_context || 'kein Kontext'}

Erstelle eine Zusammenfassung der wichtigsten Gesprächsinhalte und Erkenntnisse.`;
            case 'code_lookup':
            case 'search':
                return `${basePrompt}

Marktpartner-Suche:
- Suchterm: ${rawData.searchTerm || rawData.query || 'unbekannt'}
- Gesuchte Codes: ${((_d = rawData.searched_codes) === null || _d === void 0 ? void 0 : _d.join(', ')) || 'keine'}
- Gefundene Marktpartner: ${((_e = rawData.found_partners) === null || _e === void 0 ? void 0 : _e.length) || ((_f = rawData.results) === null || _f === void 0 ? void 0 : _f.length) || 0}
- Anzahl Treffer: ${rawData.count || ((_g = rawData.results) === null || _g === void 0 ? void 0 : _g.length) || 0}
- Suchkriterien: ${JSON.stringify(rawData.search_criteria || {})}

Fasse die wichtigsten gefundenen Informationen und deren Relevanz zusammen.`;
            case 'bilateral_clarification':
            case 'status':
                return `${basePrompt}

Bilaterale Klärung:
- Partner: ${rawData.partner_name || rawData.partner || 'unbekannt'}
- Status: ${rawData.status || 'unbekannt'}
- Thema: ${rawData.subject || 'kein Thema'}
- Kommentar: ${rawData.comment || 'kein Kommentar'}
- Beteiligte: ${((_h = rawData.participants) === null || _h === void 0 ? void 0 : _h.join(', ')) || 'keine angegeben'}
- Erkenntnisse: ${rawData.findings || 'keine'}

Fasse den aktuellen Stand und die wichtigsten Erkenntnisse zusammen.`;
            case 'screenshot_analysis':
            case 'result':
                return `${basePrompt}

Screenshot-Analyse:
- Dateiname: ${rawData.filename || 'unbekannt'}
- Extrahierte Texte: ${rawData.extractedText || 'keine'}
- KI-Analyse: ${rawData.analysis || rawData.analysis_result || 'kein Ergebnis'}
- Konfidenz: ${rawData.confidence || 'unbekannt'}
- Erkannte Elemente: ${((_j = rawData.detected_elements) === null || _j === void 0 ? void 0 : _j.join(', ')) || 'keine'}
- Kontext: ${rawData.context || 'kein Kontext'}

Fasse die wichtigsten Erkenntnisse aus der Analyse zusammen.`;
            case 'message_analysis':
            case 'analysis':
                return `${basePrompt}

Nachrichten-Analyse:
- Nachricht: ${((_k = rawData.message) === null || _k === void 0 ? void 0 : _k.substring(0, 200)) + (((_l = rawData.message) === null || _l === void 0 ? void 0 : _l.length) > 200 ? '...' : '') || 'keine'}
- Nachrichtentyp: ${rawData.message_type || rawData.messageType || 'unbekannt'}
- Kategorien: ${((_m = rawData.categories) === null || _m === void 0 ? void 0 : _m.join(', ')) || 'keine'}
- Sentiment: ${rawData.sentiment || 'unbekannt'}
- Priorität: ${rawData.priority || 'normal'}
- Analyseergebnis: ${rawData.analysis_result || 'kein Ergebnis'}
- Wichtige Punkte: ${((_o = rawData.key_points) === null || _o === void 0 ? void 0 : _o.join(', ')) || 'keine'}

Fasse die wichtigsten Erkenntnisse und Handlungsempfehlungen zusammen.`;
            case 'notes':
                return `${basePrompt}

Notizen-Aktivität:
- Anzahl Notizen: ${rawData.note_count || 'unbekannt'}
- Kategorien: ${((_p = rawData.categories) === null || _p === void 0 ? void 0 : _p.join(', ')) || 'keine'}
- Wichtige Stichworte: ${((_q = rawData.keywords) === null || _q === void 0 ? void 0 : _q.join(', ')) || 'keine'}

Fasse die wichtigsten dokumentierten Informationen zusammen.`;
            default:
                return `${basePrompt}

Allgemeine Aktivität:
${JSON.stringify(rawData, null, 2)}

Fasse die wichtigsten Aspekte dieser Aktivität zusammen.`;
        }
    }
    /**
     * Aktualisiert eine existierende Timeline-Aktivität mit der generierten Zusammenfassung
     */
    async createTimelineActivity(entry, summary) {
        // Der Placeholder-Eintrag existiert bereits - wir aktualisieren ihn
        const title = this.generateTitleForActivityType(entry.activity_type, entry.raw_data);
        const query = `
      UPDATE timeline_activities 
      SET 
        title = $2,
        content = $3,
        processing_status = $4,
        processed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
        await this.db.query(query, [
            entry.activity_id, // Die ID der existierenden Timeline-Aktivität
            title,
            summary,
            'completed'
        ]);
        logger_1.logger.debug(`Updated timeline activity ${entry.activity_id} with generated summary`);
    }
    /**
     * Generiert einen informativen Titel basierend auf dem Aktivitätstyp und Raw-Daten
     */
    generateTitleForActivityType(activityType, rawData) {
        var _a;
        switch (activityType) {
            case 'message':
            case 'chat_message':
                // Für Chat-Nachrichten: Nutze Chat-Titel oder ersten Teil der User-Message
                if (rawData.chatTitle && rawData.chatTitle !== 'Neue Unterhaltung') {
                    return `Chat: ${rawData.chatTitle}`;
                }
                else if (rawData.userMessage) {
                    const userMsg = rawData.userMessage.substring(0, 60);
                    return `Chat: ${userMsg}${userMsg.length >= 60 ? '...' : ''}`;
                }
                else {
                    return 'Chat-Nachricht';
                }
            case 'chat_session':
                if (rawData.chatTitle) {
                    return `Chat-Session: ${rawData.chatTitle}`;
                }
                return `Chat-Session (${rawData.message_count || 0} Nachrichten)`;
            case 'code_lookup':
            case 'search':
                if (rawData.searchTerm || rawData.query) {
                    return `Marktpartner-Suche: ${rawData.searchTerm || rawData.query}`;
                }
                else if ((_a = rawData.searched_codes) === null || _a === void 0 ? void 0 : _a.length) {
                    return `Code-Lookup: ${rawData.searched_codes.join(', ')}`;
                }
                return 'Marktpartner-Suche';
            case 'bilateral_clarification':
            case 'status':
                if (rawData.subject) {
                    return `Bilaterale Klärung: ${rawData.subject}`;
                }
                else if (rawData.partner_name || rawData.partner) {
                    return `Bilaterale Klärung: ${rawData.partner_name || rawData.partner}`;
                }
                return 'Bilaterale Klärung';
            case 'screenshot_analysis':
            case 'result':
                if (rawData.filename) {
                    return `Screenshot-Analyse: ${rawData.filename}`;
                }
                return 'Screenshot-Analyse durchgeführt';
            case 'message_analysis':
            case 'analysis':
                if (rawData.messageType && rawData.messageType !== 'normal') {
                    return `Nachrichten-Analyse: ${rawData.messageType}`;
                }
                else if (rawData.message_type) {
                    return `Nachrichten-Analyse: ${rawData.message_type}`;
                }
                return 'Nachrichten-Analyse';
            case 'notes':
                if (rawData.title) {
                    return `Notiz: ${rawData.title}`;
                }
                return `Notizen erstellt (${rawData.note_count || 0})`;
            default:
                // Fallback: Versuche Feature-Name und Activity-Type zu kombinieren
                const feature = rawData.feature || 'Unbekannt';
                return `${feature}: ${activityType}`;
        }
    }
    /**
     * Behandelt Verarbeitungsfehler
     */
    async handleProcessingError(entry, error) {
        const retryCount = entry.retry_count + 1;
        const maxRetries = 3;
        if (retryCount >= maxRetries) {
            // Markiere als fehlgeschlagen
            await this.updateQueueStatus(entry.id, 'failed', error.message);
            logger_1.logger.error(`Timeline entry ${entry.id} failed permanently after ${maxRetries} retries`);
        }
        else {
            // Plane Wiederholung - erhöhe retry_count
            await this.db.query(`
        UPDATE timeline_processing_queue 
        SET status = 'queued', 
            retry_count = $2, 
            error_message = $3
        WHERE id = $1
      `, [entry.id, retryCount, error.message]);
            logger_1.logger.warn(`Timeline entry ${entry.id} will be retried (attempt ${retryCount}/${maxRetries})`);
        }
    }
    /**
     * Aktualisiert den Status eines Queue-Eintrags
     */
    async updateQueueStatus(id, status, errorMessage) {
        const query = `
      UPDATE timeline_processing_queue 
      SET status = $2
          ${errorMessage ? ', error_message = $3' : ''}
      WHERE id = $1
    `;
        const params = errorMessage ? [id, status, errorMessage] : [id, status];
        await this.db.query(query, params);
    }
    /**
     * Entfernt einen erfolgreich verarbeiteten Eintrag aus der Queue
     */
    async removeFromQueue(id) {
        await this.db.query('DELETE FROM timeline_processing_queue WHERE id = $1', [id]);
    }
    /**
     * Gibt Statistiken über die Queue zurück
     */
    async getQueueStats() {
        const query = `
      SELECT 
        status,
        COUNT(*) as count,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
      FROM timeline_processing_queue
      GROUP BY status
    `;
        const result = await this.db.query(query);
        return result.rows;
    }
    /**
     * Bereinigt alte verarbeitete Einträge (aufräumen)
     */
    async cleanup() {
        // Entferne erfolgreiche Einträge älter als 7 Tage
        await this.db.query(`
      DELETE FROM timeline_processing_queue 
      WHERE status = 'completed' 
        AND updated_at < NOW() - INTERVAL '7 days'
    `);
        // Entferne fehlgeschlagene Einträge älter als 30 Tage
        await this.db.query(`
      DELETE FROM timeline_processing_queue 
      WHERE status = 'failed' 
        AND updated_at < NOW() - INTERVAL '30 days'
    `);
        logger_1.logger.info('Timeline queue cleanup completed');
    }
}
// Singleton-Instanz
exports.timelineProcessor = new TimelineProcessor();
// Graceful shutdown
process.on('SIGTERM', () => {
    exports.timelineProcessor.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    exports.timelineProcessor.stop();
    process.exit(0);
});
//# sourceMappingURL=timelineProcessor.js.map