import { Pool } from 'pg';
// Use central LLM service instead of direct Gemini integration
const LLMDataExtractionService = require('../services/llmDataExtractionService.js');
import { logger } from '../lib/logger';
import pool from '../config/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Stelle sicher, dass .env geladen wird mit korrektem Pfad
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface QueueEntry {
  id: string;
  activity_id: string;
  timeline_id: string;
  raw_data: any;
  activity_type: string;
  created_at: Date;
  retry_count: number;
}

interface ProcessingResult {
  success: boolean;
  summary?: string;
  error?: string;
}

class TimelineProcessor {
  private db: Pool;
  private llmService: any;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.db = pool; // Verwende die bereits konfigurierte Pool-Instanz
    this.llmService = new LLMDataExtractionService();
  }

  /**
   * Startet den Background Worker
   */
  public start(): void {
    if (this.processingInterval) {
      logger.warn('Timeline processor is already running');
      return;
    }

    logger.info('Starting timeline processor...');
    
    // Verarbeite Queue alle 30 Sekunden
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        logger.error('Error in timeline processing interval:', error);
      });
    }, 30000);

    // Einmalige Verarbeitung beim Start
    this.processQueue().catch(error => {
      logger.error('Error in initial timeline processing:', error);
    });
  }

  /**
   * Stoppt den Background Worker
   */
  public stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Timeline processor stopped');
    }
  }

  /**
   * Verarbeitet alle ausstehenden Queue-Einträge
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Timeline processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const queueEntries = await this.getQueueEntries();
      
      if (queueEntries.length === 0) {
        logger.debug('No timeline queue entries to process');
        return;
      }

      logger.info(`Processing ${queueEntries.length} timeline queue entries`);

      for (const entry of queueEntries) {
        try {
          await this.processEntry(entry);
        } catch (error) {
          logger.error(`Error processing timeline entry ${entry.id}:`, error);
          await this.handleProcessingError(entry, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Holt ausstehende Queue-Einträge aus der Datenbank
   */
  private async getQueueEntries(): Promise<QueueEntry[]> {
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
  private async processEntry(entry: QueueEntry): Promise<void> {
    logger.debug(`Processing timeline entry ${entry.id} for activity ${entry.activity_id}`);

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
        
        logger.info(`Successfully processed timeline entry ${entry.id} for activity ${entry.activity_id}`);
      } else {
        throw new Error(result.error || 'Failed to generate summary');
      }
    } catch (error) {
      await this.handleProcessingError(entry, error);
      throw error;
    }
  }

  /**
   * Generiert eine KI-Zusammenfassung für eine Aktivität
   */
  private async generateSummary(entry: QueueEntry): Promise<ProcessingResult> {
    try {
      // Use central LLM service for timeline activity summary generation
      const result = await this.llmService.generateTimelineActivitySummary(
        entry.raw_data.feature || 'unknown',
        entry.activity_type,
        entry.raw_data
      );

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
    } catch (error: any) {
      logger.error(`Error generating summary for entry ${entry.id}:`, error);
      
      // Rate limiting handling
      if (error.message?.includes('quota') || error.message?.includes('rate')) {
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
  private buildPromptForActivityType(activityType: string, rawData: any): string {
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
      case 'chat_session':
        return `${basePrompt}

Chat-Session Daten:
- Anzahl Nachrichten: ${rawData.message_count || 'unbekannt'}
- Dauer: ${rawData.duration || 'unbekannt'}
- Hauptthemen: ${rawData.topics?.join(', ') || 'keine spezifiziert'}
- Letzter Kontext: ${rawData.last_context || 'kein Kontext'}

Erstelle eine Zusammenfassung der wichtigsten Gesprächsinhalte und Erkenntnisse.`;

      case 'code_lookup':
        return `${basePrompt}

Code-Lookup Aktivität:
- Gesuchte Codes: ${rawData.searched_codes?.join(', ') || 'keine'}
- Gefundene Marktpartner: ${rawData.found_partners?.length || 0}
- Suchkriterien: ${JSON.stringify(rawData.search_criteria || {})}

Fasse die wichtigsten gefundenen Informationen und deren Relevanz zusammen.`;

      case 'bilateral_clarification':
        return `${basePrompt}

Bilaterale Klärung:
- Partner: ${rawData.partner_name || 'unbekannt'}
- Status: ${rawData.status || 'unbekannt'}
- Thema: ${rawData.subject || 'kein Thema'}
- Erkenntnisse: ${rawData.findings || 'keine'}

Fasse den aktuellen Stand und die wichtigsten Erkenntnisse zusammen.`;

      case 'screenshot_analysis':
        return `${basePrompt}

Screenshot-Analyse:
- Analyseergebnis: ${rawData.analysis_result || 'kein Ergebnis'}
- Erkannte Elemente: ${rawData.detected_elements?.join(', ') || 'keine'}
- Kontext: ${rawData.context || 'kein Kontext'}

Fasse die wichtigsten Erkenntnisse aus der Analyse zusammen.`;

      case 'message_analysis':
        return `${basePrompt}

Nachrichten-Analyse:
- Nachrichtentyp: ${rawData.message_type || 'unbekannt'}
- Analyseergebnis: ${rawData.analysis_result || 'kein Ergebnis'}
- Wichtige Punkte: ${rawData.key_points?.join(', ') || 'keine'}

Fasse die wichtigsten Erkenntnisse und Handlungsempfehlungen zusammen.`;

      case 'notes':
        return `${basePrompt}

Notizen-Aktivität:
- Anzahl Notizen: ${rawData.note_count || 'unbekannt'}
- Kategorien: ${rawData.categories?.join(', ') || 'keine'}
- Wichtige Stichworte: ${rawData.keywords?.join(', ') || 'keine'}

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
  private async createTimelineActivity(entry: QueueEntry, summary: string): Promise<void> {
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

    logger.debug(`Updated timeline activity ${entry.activity_id} with generated summary`);
  }

  /**
   * Generiert einen Titel basierend auf dem Aktivitätstyp
   */
  private generateTitleForActivityType(activityType: string, rawData: any): string {
    switch (activityType) {
      case 'chat_session':
        return `Chat-Session (${rawData.message_count || 0} Nachrichten)`;
      case 'code_lookup':
        return `Code-Lookup: ${rawData.searched_codes?.join(', ') || 'Suche'}`;
      case 'bilateral_clarification':
        return `Bilaterale Klärung: ${rawData.partner_name || 'Partner'}`;
      case 'screenshot_analysis':
        return 'Screenshot-Analyse durchgeführt';
      case 'message_analysis':
        return `Nachrichten-Analyse: ${rawData.message_type || 'Nachricht'}`;
      case 'notes':
        return `Notizen erstellt (${rawData.note_count || 0})`;
      default:
        return `${activityType} ausgeführt`;
    }
  }

  /**
   * Behandelt Verarbeitungsfehler
   */
  private async handleProcessingError(entry: QueueEntry, error: any): Promise<void> {
    const retryCount = entry.retry_count + 1;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      // Markiere als fehlgeschlagen
      await this.updateQueueStatus(entry.id, 'failed', error.message);
      logger.error(`Timeline entry ${entry.id} failed permanently after ${maxRetries} retries`);
    } else {
      // Plane Wiederholung - erhöhe retry_count
      await this.db.query(`
        UPDATE timeline_processing_queue 
        SET status = 'queued', 
            retry_count = $2, 
            error_message = $3
        WHERE id = $1
      `, [entry.id, retryCount, error.message]);

      logger.warn(`Timeline entry ${entry.id} will be retried (attempt ${retryCount}/${maxRetries})`);
    }
  }

  /**
   * Aktualisiert den Status eines Queue-Eintrags
   */
  private async updateQueueStatus(id: string, status: string, errorMessage?: string): Promise<void> {
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
  private async removeFromQueue(id: string): Promise<void> {
    await this.db.query('DELETE FROM timeline_processing_queue WHERE id = $1', [id]);
  }

  /**
   * Gibt Statistiken über die Queue zurück
   */
  public async getQueueStats(): Promise<any> {
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
  public async cleanup(): Promise<void> {
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

    logger.info('Timeline queue cleanup completed');
  }
}

// Singleton-Instanz
export const timelineProcessor = new TimelineProcessor();

// Graceful shutdown
process.on('SIGTERM', () => {
  timelineProcessor.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  timelineProcessor.stop();
  process.exit(0);
});
