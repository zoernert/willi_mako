import express from 'express';
import { Pool } from 'pg';
import { ImapEmailService } from '../services/imapEmailService.js';
import llmDataExtractionService from '../services/llmDataExtractionService.js';
import AutoKlärfallService from '../services/autoKlärfallService.js';
import { TeamService } from '../services/teamService.js';

const router = express.Router();
const teamService = new TeamService();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const imapService = new ImapEmailService();
const llmService = llmDataExtractionService(); // Verwenden des Singleton
const autoKlärfallService = new AutoKlärfallService();

/**
 * GET /api/team-email-config/:teamId
 * Lädt E-Mail-Konfiguration für ein Team
 */
router.get('/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Berechtigung prüfen
        if (req.user!.role !== 'admin' && !await teamService.hasTeamAccess(req.user!.id, teamId)) {
            return res.status(403).json({ error: 'Keine Berechtigung für dieses Team' });
        }

        const result = await pool.query(`
            SELECT 
                tec.*,
                t.name as team_name
            FROM team_email_configs tec
            JOIN teams t ON tec.team_id = t.id
            WHERE tec.team_id = $1
        `, [teamId]);

        if (result.rows.length === 0) {
            return res.json({
                teamId,
                autoProcessingEnabled: false,
                imapHost: '',
                imapPort: 993,
                imapUseSSL: true,
                imapUsername: '',
                outboundEmailAddress: '',
                processingRules: {}
            });
        }

        const config = result.rows[0];
        
        // Passwort für Sicherheit entfernen
        delete config.imap_password_encrypted;
        
        res.json({
            teamId: config.team_id,
            teamName: config.team_name,
            autoProcessingEnabled: config.auto_processing_enabled,
            imapHost: config.imap_host,
            imapPort: config.imap_port,
            imapUseSSL: config.imap_use_ssl,
            imapUsername: config.imap_username,
            outboundEmailAddress: config.outbound_email_address,
            processingRules: config.processing_rules || {},
            lastProcessedUid: config.last_processed_uid,
            lastProcessedAt: config.last_processed_at,
            status: config.status
        });

    } catch (error) {
        console.error('Error loading team email config:', error);
        res.status(500).json({ error: 'Fehler beim Laden der E-Mail-Konfiguration' });
    }
});

/**
 * PUT /api/team-email-config/:teamId
 * Aktualisiert E-Mail-Konfiguration für ein Team
 */
router.put('/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        const {
            autoProcessingEnabled,
            imapHost,
            imapPort,
            imapUseSSL,
            imapUsername,
            imapPassword,
            outboundEmailAddress,
            processingRules
        } = req.body;

        // Berechtigung prüfen
        if (req.user!.role !== 'admin' && !await teamService.hasTeamAdminAccess(req.user!.id, teamId)) {
            return res.status(403).json({ error: 'Keine Admin-Berechtigung für dieses Team' });
        }

        // Validierung
        if (autoProcessingEnabled && (!imapHost || !imapUsername)) {
            return res.status(400).json({ 
                error: 'IMAP-Host und Benutzername sind erforderlich für automatische Verarbeitung' 
            });
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Passwort verschlüsseln wenn vorhanden
            let encryptedPassword = null;
            if (imapPassword) {
                encryptedPassword = ImapEmailService.encryptPassword(imapPassword) || null;
            }

            // Konfiguration speichern oder aktualisieren
            const upsertQuery = `
                INSERT INTO team_email_configs (
                    team_id,
                    auto_processing_enabled,
                    imap_host,
                    imap_port,
                    imap_use_ssl,
                    imap_username,
                    imap_password_encrypted,
                    outbound_email_address,
                    processing_rules,
                    updated_at,
                    updated_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
                ON CONFLICT (team_id) 
                DO UPDATE SET
                    auto_processing_enabled = EXCLUDED.auto_processing_enabled,
                    imap_host = EXCLUDED.imap_host,
                    imap_port = EXCLUDED.imap_port,
                    imap_use_ssl = EXCLUDED.imap_use_ssl,
                    imap_username = EXCLUDED.imap_username,
                    imap_password_encrypted = CASE 
                        WHEN EXCLUDED.imap_password_encrypted IS NOT NULL 
                        THEN EXCLUDED.imap_password_encrypted 
                        ELSE team_email_configs.imap_password_encrypted 
                    END,
                    outbound_email_address = EXCLUDED.outbound_email_address,
                    processing_rules = EXCLUDED.processing_rules,
                    updated_at = EXCLUDED.updated_at,
                    updated_by = EXCLUDED.updated_by
                RETURNING *
            `;

            const result = await client.query(upsertQuery, [
                teamId,
                autoProcessingEnabled,
                imapHost,
                imapPort || 993,
                imapUseSSL,
                imapUsername,
                encryptedPassword,
                outboundEmailAddress,
                JSON.stringify(processingRules || {}),
                req.user!.id
            ]);

            // Aktivität protokollieren
            await client.query(`
                INSERT INTO team_activities (
                    team_id,
                    activity_type,
                    description,
                    created_by,
                    created_at
                ) VALUES ($1, 'email_config_updated', $2, $3, NOW())
            `, [
                teamId,
                `E-Mail-Konfiguration ${autoProcessingEnabled ? 'aktiviert' : 'deaktiviert'}`,
                req.user!.id
            ]);

            await client.query('COMMIT');

            // IMAP-Service neu starten falls aktiviert
            if (autoProcessingEnabled) {
                try {
                    await imapService.stopMonitoring();
                    await imapService.startMonitoring();
                } catch (imapError) {
                    console.error('Error restarting IMAP service:', imapError);
                    // Nicht kritisch - Konfiguration wurde gespeichert
                }
            }

            const config = result.rows[0];
            delete config.imap_password_encrypted;

            res.json({
                message: 'E-Mail-Konfiguration erfolgreich gespeichert',
                config
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error updating team email config:', error);
        res.status(500).json({ error: 'Fehler beim Speichern der E-Mail-Konfiguration' });
    }
});

/**
 * POST /api/team-email-config/:teamId/test
 * Testet IMAP-Verbindung
 */
router.post('/:teamId/test', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { imapHost, imapPort, imapUseSSL, imapUsername, imapPassword } = req.body;

        // Berechtigung prüfen
        if (req.user!.role !== 'admin' && !await teamService.hasTeamAdminAccess(req.user!.id, teamId)) {
            return res.status(403).json({ error: 'Keine Berechtigung' });
        }

        // Test-Verbindung durchführen
        const Imap = require('imap');
        
        const testConfig = {
            host: imapHost,
            port: imapPort || 993,
            tls: imapUseSSL,
            user: imapUsername,
            password: imapPassword,
            tlsOptions: { rejectUnauthorized: false }
        };

        const testConnection = new Promise((resolve, reject) => {
            const imap = new Imap(testConfig);
            
            imap.once('ready', () => {
                imap.openBox('INBOX', true, (err) => {
                    if (err) {
                        reject(new Error(`Fehler beim Öffnen der Inbox: ${err.message}`));
                    } else {
                        imap.end();
                        resolve({ success: true, message: 'Verbindung erfolgreich' });
                    }
                });
            });

            imap.once('error', (err) => {
                reject(new Error(`IMAP-Verbindungsfehler: ${err.message}`));
            });

            // Timeout nach 10 Sekunden
            setTimeout(() => {
                imap.end();
                reject(new Error('Verbindungstest abgebrochen (Timeout)'));
            }, 10000);

            imap.connect();
        });

        const result = await testConnection;
        res.json(result);

    } catch (error) {
        console.error('IMAP test error:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/team-email-config/:teamId/status
 * Status der E-Mail-Verarbeitung
 */
router.get('/:teamId/status', async (req, res) => {
    try {
        const { teamId } = req.params;

        // Berechtigung prüfen
        if (req.user!.role !== 'admin' && !await teamService.hasTeamAccess(req.user!.id, teamId)) {
            return res.status(403).json({ error: 'Keine Berechtigung' });
        }

        // Queue-Status laden
        const queueResult = await pool.query(`
            SELECT 
                processing_status,
                COUNT(*) as count
            FROM email_processing_queue
            WHERE team_id = $1
                AND created_at > NOW() - INTERVAL '24 hours'
            GROUP BY processing_status
        `, [teamId]);

        // Letzte verarbeitete E-Mails
        const recentResult = await pool.query(`
            SELECT 
                epq.*,
                c.title as clarification_title
            FROM email_processing_queue epq
            LEFT JOIN clarifications c ON epq.created_clarification_id = c.id
            WHERE epq.team_id = $1
            ORDER BY epq.created_at DESC
            LIMIT 10
        `, [teamId]);

        // IMAP-Verbindungsstatus
        const imapStatus = imapService.getHealthStatus();
        const teamConnected = imapStatus.connections.includes(teamId);

        res.json({
            teamId,
            imapConnected: teamConnected,
            queueStats: queueResult.rows.reduce((acc, row) => {
                acc[row.processing_status] = parseInt(row.count);
                return acc;
            }, {}),
            recentEmails: recentResult.rows,
            lastUpdate: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error loading email processing status:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Status' });
    }
});

/**
 * POST /api/team-email-config/:teamId/retry
 * Wiederholt fehlgeschlagene E-Mail-Verarbeitung
 */
router.post('/:teamId/retry', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { queueIds } = req.body;

        // Berechtigung prüfen
        if (req.user!.role !== 'admin' && !await teamService.hasTeamAdminAccess(req.user!.id, teamId)) {
            return res.status(403).json({ error: 'Keine Berechtigung' });
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Status zurücksetzen
            let updateQuery;
            let values;

            if (queueIds && queueIds.length > 0) {
                const placeholders = queueIds.map((_, index) => `$${index + 2}`).join(',');
                updateQuery = `
                    UPDATE email_processing_queue 
                    SET processing_status = 'PENDING',
                        processing_attempts = 0,
                        error_message = NULL
                    WHERE team_id = $1 AND id IN (${placeholders})
                `;
                values = [teamId, ...queueIds];
            } else {
                updateQuery = `
                    UPDATE email_processing_queue 
                    SET processing_status = 'PENDING',
                        processing_attempts = 0,
                        error_message = NULL
                    WHERE team_id = $1 AND processing_status = 'FAILED'
                `;
                values = [teamId];
            }

            const result = await client.query(updateQuery, values);

            await client.query('COMMIT');

            res.json({
                message: `${result.rowCount} E-Mails für Wiederholung markiert`,
                retriedCount: result.rowCount
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error retrying email processing:', error);
        res.status(500).json({ error: 'Fehler beim Wiederholen der Verarbeitung' });
    }
});

export default router;
