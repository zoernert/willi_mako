// IMAP E-Mail Service für automatische Klärfall-Erstellung
// Erstellt: 15. August 2025
// CR-WMAKO-001: Automatisierte E-Mail-Verarbeitung
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Pool } = require('pg');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const LLMDataExtractionService = require('./llmDataExtractionService');
const AutoKlärfallService = require('./autoKlärfallService');
class ImapEmailService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.activeConnections = new Map();
        this.processignInterval = null;
        this.llmService = new LLMDataExtractionService();
        this.autoKlärfallService = new AutoKlärfallService();
    }
    /**
     * Startet die IMAP-Überwachung für alle konfigurierten Teams
     */
    async startMonitoring() {
        logger.info('Starting IMAP monitoring service...');
        // Alle Teams mit aktivierter E-Mail-Verarbeitung laden
        const teams = await this.getConfiguredTeams();
        for (const team of teams) {
            await this.startTeamMonitoring(team);
        }
        // Periodische Überprüfung alle 5 Minuten
        this.processignInterval = setInterval(() => {
            this.processQueuedEmails();
        }, 5 * 60 * 1000);
        logger.info(`IMAP monitoring started for ${teams.length} teams`);
    }
    /**
     * Stoppt die IMAP-Überwachung
     */
    async stopMonitoring() {
        logger.info('Stopping IMAP monitoring service...');
        if (this.processignInterval) {
            clearInterval(this.processignInterval);
        }
        // Alle IMAP-Verbindungen schließen
        for (const [teamId, connection] of this.activeConnections) {
            try {
                connection.end();
                logger.info(`IMAP connection closed for team ${teamId}`);
            }
            catch (error) {
                logger.error(`Error closing IMAP connection for team ${teamId}:`, error);
            }
        }
        this.activeConnections.clear();
    }
    /**
     * Lädt alle Teams mit E-Mail-Konfiguration
     */
    async getConfiguredTeams() {
        const query = `
      SELECT 
        t.id,
        t.name,
        tec.*
      FROM teams t
      JOIN team_email_configs tec ON t.id = tec.team_id
      WHERE tec.auto_processing_enabled = true
        AND tec.imap_host IS NOT NULL
        AND tec.imap_username IS NOT NULL
    `;
        const result = await this.pool.query(query);
        return result.rows;
    }
    /**
     * Startet IMAP-Überwachung für ein spezifisches Team
     */
    async startTeamMonitoring(teamConfig) {
        try {
            const imapConfig = {
                host: teamConfig.imap_host,
                port: teamConfig.imap_port || 993,
                tls: teamConfig.imap_use_ssl,
                user: teamConfig.imap_username,
                password: await this.decryptPassword(teamConfig.imap_password_encrypted),
                tlsOptions: { rejectUnauthorized: false }
            };
            const imap = new Imap(imapConfig);
            imap.once('ready', () => {
                logger.info(`IMAP connection ready for team ${teamConfig.team_id}`);
                this.openInbox(imap, teamConfig);
            });
            imap.once('error', (err) => {
                logger.error(`IMAP error for team ${teamConfig.team_id}:`, err);
                this.handleConnectionError(teamConfig.team_id, err);
            });
            imap.once('end', () => {
                logger.info(`IMAP connection ended for team ${teamConfig.team_id}`);
                this.activeConnections.delete(teamConfig.team_id);
            });
            imap.connect();
            this.activeConnections.set(teamConfig.team_id, imap);
        }
        catch (error) {
            logger.error(`Failed to start IMAP monitoring for team ${teamConfig.team_id}:`, error);
        }
    }
    /**
     * Öffnet das INBOX und überwacht neue E-Mails
     */
    openInbox(imap, teamConfig) {
        imap.openBox(teamConfig.imap_folder || 'INBOX', false, (err, box) => {
            if (err) {
                logger.error(`Failed to open inbox for team ${teamConfig.team_id}:`, err);
                return;
            }
            logger.info(`Inbox opened for team ${teamConfig.team_id}, ${box.messages.total} messages`);
            // Verarbeite ungelesene E-Mails
            this.processUnreadEmails(imap, teamConfig, box);
            // Überwache neue E-Mails
            imap.on('mail', (numNewMsgs) => {
                logger.info(`${numNewMsgs} new emails for team ${teamConfig.team_id}`);
                this.processUnreadEmails(imap, teamConfig, box);
            });
        });
    }
    /**
     * Verarbeitet ungelesene E-Mails
     */
    async processUnreadEmails(imap, teamConfig, box) {
        return new Promise((resolve, reject) => {
            // Suche nach ungelesenen E-Mails seit der letzten Verarbeitung
            let searchCriteria = ['UNSEEN'];
            if (teamConfig.last_processed_uid) {
                searchCriteria = [['UID', `${parseInt(teamConfig.last_processed_uid) + 1}:*`]];
            }
            imap.search(searchCriteria, (err, results) => {
                if (err) {
                    logger.error(`Search error for team ${teamConfig.team_id}:`, err);
                    return reject(err);
                }
                if (!results || results.length === 0) {
                    logger.debug(`No new emails for team ${teamConfig.team_id}`);
                    return resolve();
                }
                logger.info(`Processing ${results.length} emails for team ${teamConfig.team_id}`);
                const fetch = imap.fetch(results, {
                    bodies: '',
                    struct: true,
                    markSeen: false
                });
                fetch.on('message', (msg, seqno) => {
                    this.processEmailMessage(msg, seqno, teamConfig);
                });
                fetch.once('error', reject);
                fetch.once('end', () => {
                    // Update last processed UID
                    if (results.length > 0) {
                        const lastUid = Math.max(...results);
                        this.updateLastProcessedUid(teamConfig.team_id, lastUid);
                    }
                    resolve();
                });
            });
        });
    }
    /**
     * Verarbeitet eine einzelne E-Mail-Nachricht
     */
    async processEmailMessage(msg, seqno, teamConfig) {
        let emailData = {
            uid: null,
            headers: {},
            body: '',
            attachments: []
        };
        msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
            });
            stream.once('end', async () => {
                var _a, _b;
                try {
                    const parsed = await simpleParser(buffer);
                    emailData = {
                        uid: msg.uid,
                        subject: parsed.subject || '',
                        from: ((_a = parsed.from) === null || _a === void 0 ? void 0 : _a.text) || '',
                        to: ((_b = parsed.to) === null || _b === void 0 ? void 0 : _b.text) || '',
                        date: parsed.date,
                        body: parsed.text || parsed.html || '',
                        html: parsed.html || '',
                        attachments: parsed.attachments || []
                    };
                    // E-Mail zur Verarbeitungsqueue hinzufügen
                    await this.queueEmailForProcessing(teamConfig.team_id, emailData);
                }
                catch (error) {
                    logger.error(`Error parsing email for team ${teamConfig.team_id}:`, error);
                }
            });
        });
        msg.once('attributes', (attrs) => {
            emailData.uid = attrs.uid;
            emailData.flags = attrs.flags;
        });
    }
    /**
     * Fügt E-Mail zur Verarbeitungsqueue hinzu
     */
    async queueEmailForProcessing(teamId, emailData) {
        var _a;
        try {
            const insertQuery = `
        INSERT INTO email_processing_queue 
        (team_id, email_uid, email_subject, email_from, email_body, email_date, processing_status)
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        ON CONFLICT (team_id, email_uid) DO NOTHING
        RETURNING id
      `;
            const values = [
                teamId,
                (_a = emailData.uid) === null || _a === void 0 ? void 0 : _a.toString(),
                emailData.subject,
                emailData.from,
                emailData.body,
                emailData.date
            ];
            const result = await this.pool.query(insertQuery, values);
            if (result.rows.length > 0) {
                logger.info(`Email queued for processing: ${emailData.subject} from ${emailData.from}`);
                // Sofortige Verarbeitung versuchen
                await this.processQueuedEmail(result.rows[0].id);
            }
        }
        catch (error) {
            logger.error('Error queueing email for processing:', error);
        }
    }
    /**
     * Verarbeitet E-Mails aus der Queue
     */
    async processQueuedEmails() {
        try {
            const query = `
        SELECT epq.*, t.name as team_name
        FROM email_processing_queue epq
        JOIN teams t ON epq.team_id = t.id
        WHERE epq.processing_status = 'PENDING'
          AND epq.processing_attempts < 3
        ORDER BY epq.created_at ASC
        LIMIT 10
      `;
            const result = await this.pool.query(query);
            for (const email of result.rows) {
                await this.processQueuedEmail(email.id);
            }
        }
        catch (error) {
            logger.error('Error processing queued emails:', error);
        }
    }
    /**
     * Verarbeitet eine einzelne E-Mail aus der Queue
     */
    async processQueuedEmail(queueId) {
        let client;
        try {
            // Update status to processing
            await this.updateQueueStatus(queueId, 'PROCESSING');
            client = await this.pool.connect();
            // E-Mail-Daten laden
            const emailQuery = `
        SELECT epq.*, tec.processing_rules
        FROM email_processing_queue epq
        JOIN team_email_configs tec ON epq.team_id = tec.team_id
        WHERE epq.id = $1
      `;
            const emailResult = await client.query(emailQuery, [queueId]);
            if (emailResult.rows.length === 0) {
                throw new Error('Email not found in queue');
            }
            const emailData = emailResult.rows[0];
            // LLM-Datenextraktion durchführen
            const extractedData = await this.llmService.extractDataFromEmail({
                subject: emailData.email_subject,
                text: emailData.email_body,
                from: emailData.email_from,
                date: emailData.email_date
            }, emailData.team_id);
            // Update extracted data in queue
            await client.query('UPDATE email_processing_queue SET extracted_references = $1 WHERE id = $2', [JSON.stringify(extractedData), queueId]);
            // Prüfen ob E-Mail für Klärfall-Erstellung geeignet ist
            if (this.shouldCreateClarification(emailData, extractedData)) {
                const clarification = await this.autoKlärfallService.createClarificationFromEmail({
                    subject: emailData.email_subject,
                    text: emailData.email_body,
                    from: emailData.email_from,
                    date: emailData.email_date,
                    messageId: emailData.email_uid
                }, extractedData, emailData.team_id);
                if (clarification) {
                    await client.query('UPDATE email_processing_queue SET created_clarification_id = $1, processing_status = $2, processed_at = NOW() WHERE id = $3', [clarification.id, 'COMPLETED', queueId]);
                    logger.info(`Clarification ${clarification.id} created from email queue ${queueId}`);
                }
                else {
                    throw new Error('Failed to create clarification from email');
                }
            }
            else {
                // E-Mail war nicht geeignet für automatische Erstellung
                await this.updateQueueStatus(queueId, 'SKIPPED', 'No relevant references found');
            }
        }
        catch (error) {
            logger.error(`Error processing queued email ${queueId}:`, error);
            await this.updateQueueStatus(queueId, 'FAILED', error.message);
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    /**
     * Prüft ob E-Mail für Klärfall-Erstellung geeignet ist
     */
    shouldCreateClarification(emailData, extractedData) {
        var _a, _b, _c, _d;
        // Mindestens eine Referenz oder erkannte Kategorie muss vorhanden sein
        const hasReferences = extractedData.referenzen && (((_a = extractedData.referenzen.vorgangsnummern) === null || _a === void 0 ? void 0 : _a.length) > 0 ||
            ((_b = extractedData.referenzen.zählpunkte) === null || _b === void 0 ? void 0 : _b.length) > 0 ||
            ((_c = extractedData.referenzen.lieferstellen) === null || _c === void 0 ? void 0 : _c.length) > 0);
        const hasCategory = ((_d = extractedData.klassifikation) === null || _d === void 0 ? void 0 : _d.kategorie) &&
            extractedData.klassifikation.kategorie !== 'Unbekannt';
        // Confidence-Schwellwert
        const hasMinConfidence = extractedData.confidence >= 0.3;
        return (hasReferences || hasCategory) && hasMinConfidence;
    }
    /**
     * Aktualisiert den Status einer E-Mail in der Queue
     */
    async updateQueueStatus(queueId, status, errorMessage = null) {
        try {
            const query = `
        UPDATE email_processing_queue 
        SET processing_status = $1, 
            processing_attempts = processing_attempts + 1,
            error_message = $2,
            processed_at = CASE WHEN $1 IN ('COMPLETED', 'FAILED', 'SKIPPED') THEN NOW() ELSE processed_at END
        WHERE id = $3
      `;
            await this.pool.query(query, [status, errorMessage, queueId]);
        }
        catch (error) {
            logger.error(`Error updating queue status for ${queueId}:`, error);
        }
    }
    /**
     * Aktualisiert die letzte verarbeitete UID für ein Team
     */
    async updateLastProcessedUid(teamId, uid) {
        try {
            await this.pool.query('UPDATE team_email_configs SET last_processed_uid = $1 WHERE team_id = $2', [uid.toString(), teamId]);
        }
        catch (error) {
            logger.error(`Error updating last processed UID for team ${teamId}:`, error);
        }
    }
    /**
     * Entschlüsselt Passwort (vereinfacht - in Produktion sollte echte Verschlüsselung verwendet werden)
     */
    async decryptPassword(encryptedPassword) {
        // Vereinfachte Implementierung - in Produktion sollte echte Verschlüsselung verwendet werden
        if (!encryptedPassword)
            return '';
        try {
            const algorithm = 'aes-256-cbc';
            const key = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-change-in-production';
            const keyHash = crypto.createHash('sha256').update(key).digest();
            const parts = encryptedPassword.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = Buffer.from(parts[1], 'hex');
            const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
            let decrypted = decipher.update(encrypted, null, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            logger.error('Error decrypting password:', error);
            return '';
        }
    }
    /**
     * Verschlüsselt Passwort für Speicherung
     */
    static encryptPassword(password) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-change-in-production';
            const keyHash = crypto.createHash('sha256').update(key).digest();
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
            let encrypted = cipher.update(password, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        }
        catch (error) {
            logger.error('Error encrypting password:', error);
            return '';
        }
    }
    /**
     * Behandelt Verbindungsfehler
     */
    async handleConnectionError(teamId, error) {
        logger.error(`IMAP connection error for team ${teamId}:`, error);
        // Verbindung aus Map entfernen
        this.activeConnections.delete(teamId);
        // Nach 5 Minuten Wiederverbindung versuchen
        setTimeout(async () => {
            try {
                const teams = await this.getConfiguredTeams();
                const team = teams.find(t => t.team_id === teamId);
                if (team) {
                    logger.info(`Attempting to reconnect IMAP for team ${teamId}`);
                    await this.startTeamMonitoring(team);
                }
            }
            catch (reconnectError) {
                logger.error(`Failed to reconnect IMAP for team ${teamId}:`, reconnectError);
            }
        }, 5 * 60 * 1000);
    }
    /**
     * Gesundheitsstatus der IMAP-Verbindungen
     */
    getHealthStatus() {
        return {
            activeConnections: this.activeConnections.size,
            isMonitoring: this.processignInterval !== null,
            connections: Array.from(this.activeConnections.keys())
        };
    }
}
module.exports = { ImapEmailService };
//# sourceMappingURL=imapEmailService.js.map