const { ImapEmailService } = require('./imapEmailService');
const llmDataExtractionService = require('./llmDataExtractionService');
const AutoKlärfallService = require('./autoKlärfallService');
const { Pool } = require('pg');

class ImapScheduler {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        this.imapService = new ImapEmailService();
        this.llmService = llmDataExtractionService(); // Verwenden des Singleton
        this.autoKlärfallService = new AutoKlärfallService();
        this.isRunning = false;
        this.intervals = new Map();
    }

    /**
     * Startet den IMAP-Scheduler für alle Teams
     */
    async start() {
        try {
            console.log('🚀 Starting IMAP Scheduler...');
            
            // Alle Teams mit E-Mail-Konfiguration laden
            const teams = await this.getTeamsWithEmailConfig();
            
            for (const team of teams) {
                await this.startTeamMonitoring(team);
            }
            
            this.isRunning = true;
            console.log(`✅ IMAP Scheduler started for ${teams.length} teams`);
            
        } catch (error) {
            console.error('❌ Error starting IMAP Scheduler:', error);
        }
    }

    /**
     * Stoppt den IMAP-Scheduler
     */
    async stop() {
        try {
            console.log('🛑 Stopping IMAP Scheduler...');
            
            // Alle Intervalle stoppen
            for (const [teamId, interval] of this.intervals) {
                clearInterval(interval);
                console.log(`✅ Stopped monitoring for team ${teamId}`);
            }
            
            this.intervals.clear();
            this.isRunning = false;
            
            console.log('✅ IMAP Scheduler stopped');
            
        } catch (error) {
            console.error('❌ Error stopping IMAP Scheduler:', error);
        }
    }

    /**
     * Startet die E-Mail-Überwachung für ein Team
     */
    async startTeamMonitoring(team) {
        try {
            const { id: teamId, name: teamName, imap_config } = team;
            
            if (!imap_config || !imap_config.enabled) {
                console.log(`⏭️  Team ${teamName} (${teamId}): IMAP not enabled`);
                return;
            }

            // Intervall für E-Mail-Überwachung (alle 5 Minuten)
            const interval = setInterval(async () => {
                await this.processTeamEmails(team);
            }, 5 * 60 * 1000); // 5 Minuten

            this.intervals.set(teamId, interval);
            
            console.log(`✅ Started monitoring for team ${teamName} (${teamId})`);
            
            // Erste Ausführung sofort
            await this.processTeamEmails(team);
            
        } catch (error) {
            console.error(`❌ Error starting monitoring for team ${team.id}:`, error);
        }
    }

    /**
     * Verarbeitet E-Mails für ein Team
     */
    async processTeamEmails(team) {
        try {
            const { id: teamId, name: teamName, imap_config } = team;
            
            console.log(`📧 Processing emails for team ${teamName} (${teamId})...`);
            
            // E-Mails abrufen
            const emails = await this.imapService.fetchEmails(imap_config);
            
            if (emails.length === 0) {
                console.log(`📭 No new emails for team ${teamName}`);
                return;
            }
            
            console.log(`📬 Found ${emails.length} new emails for team ${teamName}`);
            
            // E-Mails verarbeiten
            for (const email of emails) {
                await this.processEmail(email, teamId);
            }
            
        } catch (error) {
            console.error(`❌ Error processing emails for team ${team.id}:`, error);
        }
    }

    /**
     * Verarbeitet eine einzelne E-Mail
     */
    async processEmail(email, teamId) {
        try {
            // E-Mail in Verarbeitungsqueue einreihen
            await this.addToProcessingQueue(email, teamId);
            
            // LLM-Datenextraktion
            const extractedData = await this.llmService.extractDataFromEmail(email);
            
            if (extractedData && extractedData.confidence > 0.7) {
                // Automatischen Klärfall erstellen
                const clarification = await this.autoKlärfallService.createFromEmail(
                    email, 
                    extractedData, 
                    teamId
                );
                
                if (clarification) {
                    console.log(`✅ Created clarification ${clarification.id} from email`);
                } else {
                    console.log(`⚠️  Could not create clarification from email`);
                }
            } else {
                console.log(`⚠️  Low confidence for email extraction: ${extractedData?.confidence || 0}`);
            }
            
        } catch (error) {
            console.error('❌ Error processing email:', error);
        }
    }

    /**
     * Fügt E-Mail zur Verarbeitungsqueue hinzu
     */
    async addToProcessingQueue(email, teamId) {
        const query = `
            INSERT INTO email_processing_queue (
                team_id, email_id, subject, sender, received_at, 
                content_preview, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
            ON CONFLICT (email_id) DO NOTHING
        `;
        
        const contentPreview = email.text ? email.text.substring(0, 500) : '';
        
        await this.pool.query(query, [
            teamId,
            email.messageId,
            email.subject,
            email.from,
            email.date,
            contentPreview
        ]);
    }

    /**
     * Lädt alle Teams mit E-Mail-Konfiguration
     */
    async getTeamsWithEmailConfig() {
        const query = `
            SELECT t.id, t.name, tec.imap_config
            FROM teams t
            JOIN team_email_configs tec ON t.id = tec.team_id
            WHERE tec.imap_config IS NOT NULL
        `;
        
        const result = await this.pool.query(query);
        return result.rows;
    }

    /**
     * Fügt ein neues Team zur Überwachung hinzu
     */
    async addTeamMonitoring(teamId) {
        try {
            const query = `
                SELECT t.id, t.name, tec.imap_config
                FROM teams t
                JOIN team_email_configs tec ON t.id = tec.team_id
                WHERE t.id = $1 AND tec.imap_config IS NOT NULL
            `;
            
            const result = await this.pool.query(query, [teamId]);
            
            if (result.rows.length > 0) {
                await this.startTeamMonitoring(result.rows[0]);
                console.log(`✅ Added monitoring for team ${teamId}`);
            }
            
        } catch (error) {
            console.error(`❌ Error adding team monitoring for ${teamId}:`, error);
        }
    }

    /**
     * Entfernt ein Team von der Überwachung
     */
    async removeTeamMonitoring(teamId) {
        try {
            const interval = this.intervals.get(teamId);
            if (interval) {
                clearInterval(interval);
                this.intervals.delete(teamId);
                console.log(`✅ Removed monitoring for team ${teamId}`);
            }
        } catch (error) {
            console.error(`❌ Error removing team monitoring for ${teamId}:`, error);
        }
    }

    /**
     * Status des Schedulers abrufen
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            monitoredTeams: Array.from(this.intervals.keys()),
            totalTeams: this.intervals.size
        };
    }
}

module.exports = ImapScheduler;
