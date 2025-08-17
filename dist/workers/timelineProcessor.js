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
     * Aktualisiert eine existierende Timeline-Aktivität mit der generierten Zusammenfassung
     */
    async createTimelineActivity(entry, summary) {
        // Hole den Titel auch vom LLM-Service
        const result = await this.llmService.generateTimelineActivitySummary(entry.raw_data.feature || 'unknown', entry.activity_type, entry.raw_data);
        const title = result.title || this.generateTitleForActivityType(entry.activity_type, entry.raw_data);
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
        logger_1.logger.debug(`Updated timeline activity ${entry.activity_id} with generated summary and title`);
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