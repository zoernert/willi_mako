const { Pool } = require('pg');
const llmDataExtractionService = require('./llmDataExtractionService');
class AutoKlärfallService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        this.llmService = llmDataExtractionService(); // Verwenden des Singleton
    }
    /**
     * Erstellt automatisch einen Klärfall basierend auf E-Mail und LLM-Extraktion
     * @param {Object} email - E-Mail-Objekt
     * @param {Object} extractedData - Von LLM extrahierte Daten
     * @param {string} teamId - Team-ID
     * @returns {Promise<Object>} Erstellter Klärfall
     */
    async createClarificationFromEmail(email, extractedData, teamId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // 1. Marktpartner finden oder erstellen
            const partnerId = await this.findOrCreateMarketPartner(extractedData.marktpartner, client);
            // 2. Basis-Klärfall erstellen
            const clarification = await this.createBaseClarification(email, extractedData, teamId, partnerId, client);
            // 3. Referenzen verknüpfen
            await this.linkReferences(clarification.id, extractedData.referenzen, client);
            // 4. LLM-Extraktion speichern
            await this.saveLLMExtraction(clarification.id, extractedData, client);
            // 5. Automatische Aktionen ausführen
            await this.executeAutomaticActions(clarification, extractedData, client);
            await client.query('COMMIT');
            // 6. Benachrichtigungen senden
            await this.sendNotifications(clarification, extractedData);
            return {
                ...clarification,
                extractedData,
                partnerId,
                automated: true
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating auto-clarification:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Findet existierenden Marktpartner oder erstellt neuen
     */
    async findOrCreateMarketPartner(partnerData, client) {
        try {
            if (!partnerData || (!partnerData.name && !partnerData.domain)) {
                return null;
            }
            // Zuerst nach Domain suchen
            if (partnerData.domain) {
                const domainResult = await client.query(`
                    SELECT id FROM market_partners 
                    WHERE email_domain = $1 OR name ILIKE $2
                `, [partnerData.domain, `%${partnerData.domain}%`]);
                if (domainResult.rows.length > 0) {
                    return domainResult.rows[0].id;
                }
            }
            // Nach Name suchen
            if (partnerData.name) {
                const nameResult = await client.query(`
                    SELECT id FROM market_partners 
                    WHERE name ILIKE $1
                `, [`%${partnerData.name}%`]);
                if (nameResult.rows.length > 0) {
                    return nameResult.rows[0].id;
                }
            }
            // Neuen Marktpartner erstellen
            const insertResult = await client.query(`
                INSERT INTO market_partners (
                    name, 
                    email_domain, 
                    codes, 
                    created_at, 
                    created_by,
                    auto_created
                ) VALUES ($1, $2, $3, NOW(), 'system', true)
                RETURNING id
            `, [
                partnerData.name || `Unbekannt (${partnerData.domain})`,
                partnerData.domain,
                JSON.stringify(partnerData.codes || [])
            ]);
            return insertResult.rows[0].id;
        }
        catch (error) {
            console.error('Error finding/creating market partner:', error);
            return null;
        }
    }
    /**
     * Erstellt den Basis-Klärfall
     */
    async createBaseClarification(email, extractedData, teamId, partnerId, client) {
        var _a, _b, _c;
        const clarificationData = {
            title: this.generateTitle(email.subject, extractedData),
            description: this.generateDescription(email, extractedData),
            category: this.mapCategory((_a = extractedData.klassifikation) === null || _a === void 0 ? void 0 : _a.kategorie),
            priority: this.mapPriority((_b = extractedData.klassifikation) === null || _b === void 0 ? void 0 : _b.priorität),
            type: this.determineClarificationType(extractedData),
            status: this.determineInitialStatus(extractedData),
            teamId,
            partnerId,
            originalEmail: {
                subject: email.subject,
                from: email.from,
                date: email.date,
                messageId: email.messageId
            }
        };
        const result = await client.query(`
            INSERT INTO clarifications (
                title,
                description, 
                category,
                priority,
                type,
                status,
                team_id,
                market_partner_id,
                original_email,
                estimated_effort,
                created_at,
                created_by,
                auto_created
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'system', true)
            RETURNING *
        `, [
            clarificationData.title,
            clarificationData.description,
            clarificationData.category,
            clarificationData.priority,
            clarificationData.type,
            clarificationData.status,
            clarificationData.teamId,
            clarificationData.partnerId,
            JSON.stringify(clarificationData.originalEmail),
            this.mapEffort((_c = extractedData.klassifikation) === null || _c === void 0 ? void 0 : _c.arbeitsaufwand)
        ]);
        return result.rows[0];
    }
    /**
     * Verknüpft extrahierte Referenzen mit dem Klärfall
     */
    async linkReferences(clarificationId, references, client) {
        try {
            const allReferences = [
                ...(references.vorgangsnummern || []).map(ref => ({ type: 'vorgangsNummer', value: ref })),
                ...(references.zählpunkte || []).map(ref => ({ type: 'zählpunkt', value: ref })),
                ...(references.lieferstellen || []).map(ref => ({ type: 'lieferstelle', value: ref })),
                ...(references.zeiträume || []).map(ref => ({ type: 'zeitraum', value: ref }))
            ];
            for (const ref of allReferences) {
                await client.query(`
                    INSERT INTO clarification_references (
                        clarification_id,
                        reference_type,
                        reference_value,
                        auto_extracted,
                        created_at
                    ) VALUES ($1, $2, $3, true, NOW())
                `, [clarificationId, ref.type, ref.value]);
            }
        }
        catch (error) {
            console.error('Error linking references:', error);
            // Nicht kritisch - Klärfall kann ohne Referenzen existieren
        }
    }
    /**
     * Speichert LLM-Extraktion für späteren Zugriff
     */
    async saveLLMExtraction(clarificationId, extractedData, client) {
        try {
            await client.query(`
                INSERT INTO clarification_llm_extractions (
                    clarification_id,
                    extracted_data,
                    confidence,
                    extraction_version,
                    created_at
                ) VALUES ($1, $2, $3, $4, NOW())
            `, [
                clarificationId,
                JSON.stringify(extractedData),
                extractedData.confidence,
                '1.0'
            ]);
        }
        catch (error) {
            console.error('Error saving LLM extraction:', error);
            // Nicht kritisch
        }
    }
    /**
     * Führt automatische Aktionen basierend auf LLM-Analyse aus
     */
    async executeAutomaticActions(clarification, extractedData, client) {
        var _a, _b, _c, _d;
        try {
            // Automatische Zuordnung zu Team-Mitglied
            if ((_a = extractedData.automatisierung) === null || _a === void 0 ? void 0 : _a.autoBearbeitung) {
                await this.assignToSpecialist(clarification, extractedData, client);
            }
            // Standardantwort vorbereiten
            if ((_b = extractedData.automatisierung) === null || _b === void 0 ? void 0 : _b.standardAntwort) {
                const standardResponse = await this.llmService.suggestStandardResponse(clarification.original_email, extractedData);
                if (standardResponse) {
                    await this.saveDraftResponse(clarification.id, standardResponse, client);
                }
            }
            // Automatische Weiterleitung
            if ((_d = (_c = extractedData.automatisierung) === null || _c === void 0 ? void 0 : _c.weiterleitung) === null || _d === void 0 ? void 0 : _d.erforderlich) {
                await this.createForwardingTask(clarification, extractedData, client);
            }
            // Wiedervorlage einrichten
            await this.scheduleFollowUp(clarification, extractedData, client);
        }
        catch (error) {
            console.error('Error executing automatic actions:', error);
            // Nicht kritisch - Klärfall ist bereits erstellt
        }
    }
    /**
     * Weist Klärfall automatisch einem Spezialisten zu
     */
    async assignToSpecialist(clarification, extractedData, client) {
        var _a;
        try {
            // Finde den besten Spezialisten basierend auf Kategorie und Workload
            const specialist = await client.query(`
                WITH specialist_workload AS (
                    SELECT 
                        u.id,
                        u.name,
                        COUNT(c.id) as current_workload,
                        us.specializations
                    FROM users u
                    JOIN team_members tm ON u.id = tm.user_id
                    LEFT JOIN user_specializations us ON u.id = us.user_id
                    LEFT JOIN clarifications c ON c.assigned_to = u.id 
                        AND c.status IN ('offen', 'in_bearbeitung', 'wartet_auf_antwort')
                    WHERE tm.team_id = $1
                    AND ($2 = ANY(us.specializations) OR us.specializations IS NULL)
                    GROUP BY u.id, u.name, us.specializations
                    ORDER BY current_workload ASC, random()
                    LIMIT 1
                )
                SELECT id FROM specialist_workload
            `, [clarification.team_id, (_a = extractedData.klassifikation) === null || _a === void 0 ? void 0 : _a.kategorie]);
            if (specialist.rows.length > 0) {
                await client.query(`
                    UPDATE clarifications 
                    SET assigned_to = $1, 
                        status = 'zugewiesen',
                        assigned_at = NOW()
                    WHERE id = $2
                `, [specialist.rows[0].id, clarification.id]);
                // Aktivität protokollieren
                await this.logActivity(clarification.id, 'auto_assigned', `Automatisch zugewiesen an ${specialist.rows[0].name}`, client);
            }
        }
        catch (error) {
            console.error('Error auto-assigning specialist:', error);
        }
    }
    /**
     * Speichert Antwort-Entwurf
     */
    async saveDraftResponse(clarificationId, response, client) {
        try {
            await client.query(`
                INSERT INTO clarification_drafts (
                    clarification_id,
                    draft_type,
                    subject,
                    body,
                    confidence,
                    auto_generated,
                    created_at
                ) VALUES ($1, 'standard_response', $2, $3, $4, true, NOW())
            `, [
                clarificationId,
                response.subject,
                response.body,
                response.confidence
            ]);
        }
        catch (error) {
            console.error('Error saving draft response:', error);
        }
    }
    /**
     * Erstellt Bulk-Klärfall für Listen-E-Mails
     */
    async createBulkClarification(email, listItems, extractedData, teamId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Haupt-Klärfall erstellen
            const mainClarification = await this.createBaseClarification(email, { ...extractedData, type: 'sammelklärung' }, teamId, null, client);
            // Einzeleinträge erstellen
            const items = [];
            for (let i = 0; i < listItems.length; i++) {
                const item = listItems[i];
                const itemResult = await client.query(`
                    INSERT INTO bulk_clarification_items (
                        bulk_clarification_id,
                        item_index,
                        title,
                        description,
                        reference_data,
                        status,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, 'offen', NOW())
                    RETURNING *
                `, [
                    mainClarification.id,
                    i + 1,
                    item.title || `Eintrag ${i + 1}`,
                    item.description,
                    JSON.stringify(item.references || {})
                ]);
                items.push(itemResult.rows[0]);
            }
            await client.query('COMMIT');
            return {
                ...mainClarification,
                items,
                type: 'sammelklärung',
                totalItems: items.length
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating bulk clarification:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Utility-Funktionen für Mapping und Generierung
     */
    generateTitle(subject, extractedData) {
        var _a, _b;
        const category = ((_a = extractedData.klassifikation) === null || _a === void 0 ? void 0 : _a.kategorie) || 'Allgemein';
        const partner = ((_b = extractedData.marktpartner) === null || _b === void 0 ? void 0 : _b.name) || 'Unbekannt';
        return `${category}: ${subject}`.substring(0, 200);
    }
    generateDescription(email, extractedData) {
        var _a, _b, _c, _d, _e;
        let description = `**Automatisch erstellt aus E-Mail**\n\n`;
        description += `**Von:** ${email.from}\n`;
        description += `**Betreff:** ${email.subject}\n`;
        description += `**Datum:** ${email.date}\n\n`;
        if ((_a = extractedData.inhalt) === null || _a === void 0 ? void 0 : _a.zusammenfassung) {
            description += `**Zusammenfassung:** ${extractedData.inhalt.zusammenfassung}\n\n`;
        }
        if (((_c = (_b = extractedData.inhalt) === null || _b === void 0 ? void 0 : _b.klärungspunkte) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            description += `**Klärungspunkte:**\n`;
            extractedData.inhalt.klärungspunkte.forEach(punkt => {
                description += `- ${punkt}\n`;
            });
            description += '\n';
        }
        if (((_e = (_d = extractedData.inhalt) === null || _d === void 0 ? void 0 : _d.nächsteSchritte) === null || _e === void 0 ? void 0 : _e.length) > 0) {
            description += `**Vorgeschlagene nächste Schritte:**\n`;
            extractedData.inhalt.nächsteSchritte.forEach(schritt => {
                description += `- ${schritt}\n`;
            });
        }
        description += `\n**Original E-Mail-Text:**\n${email.text || email.html}`;
        return description;
    }
    mapCategory(category) {
        const mapping = {
            'Abrechnung': 'billing',
            'Lieferantenwechsel': 'supplier_change',
            'Messstellenbetrieb': 'metering',
            'Netzentgelte': 'grid_fees',
            'Regulatorik': 'regulatory',
            'Kundenanfrage': 'customer_inquiry',
            'Technisch': 'technical'
        };
        return mapping[category] || 'general';
    }
    mapPriority(priority) {
        const mapping = {
            'Niedrig': 'low',
            'Normal': 'normal',
            'Hoch': 'high',
            'Kritisch': 'critical'
        };
        return mapping[priority] || 'normal';
    }
    mapEffort(effort) {
        const mapping = {
            'Gering': 'low',
            'Mittel': 'medium',
            'Hoch': 'high'
        };
        return mapping[effort] || 'medium';
    }
    determineClarificationType(extractedData) {
        var _a, _b;
        if ((_b = (_a = extractedData.automatisierung) === null || _a === void 0 ? void 0 : _a.weiterleitung) === null || _b === void 0 ? void 0 : _b.erforderlich) {
            return 'intern';
        }
        return 'bilateral';
    }
    determineInitialStatus(extractedData) {
        var _a;
        if ((_a = extractedData.automatisierung) === null || _a === void 0 ? void 0 : _a.autoBearbeitung) {
            return 'in_bearbeitung';
        }
        return 'offen';
    }
    async logActivity(clarificationId, activityType, description, client) {
        try {
            await client.query(`
                INSERT INTO clarification_activities (
                    clarification_id,
                    activity_type,
                    description,
                    created_by,
                    created_at
                ) VALUES ($1, $2, $3, 'system', NOW())
            `, [clarificationId, activityType, description]);
        }
        catch (error) {
            console.error('Error logging activity:', error);
        }
    }
    async sendNotifications(clarification, extractedData) {
        try {
            // Implementierung für E-Mail-Benachrichtigungen
            // Wird mit existierendem emailService integriert
            console.log(`Notification for clarification ${clarification.id} would be sent`);
        }
        catch (error) {
            console.error('Error sending notifications:', error);
        }
    }
    async scheduleFollowUp(clarification, extractedData, client) {
        try {
            // Standard Follow-up nach 3 Tagen für automatische Klärfälle
            const followUpDate = new Date();
            followUpDate.setDate(followUpDate.getDate() + 3);
            await client.query(`
                INSERT INTO clarification_follow_ups (
                    clarification_id,
                    follow_up_date,
                    reminder_type,
                    auto_created,
                    created_at
                ) VALUES ($1, $2, 'progress_check', true, NOW())
            `, [clarification.id, followUpDate]);
        }
        catch (error) {
            console.error('Error scheduling follow-up:', error);
        }
    }
    /**
     * Health Check für den Service
     */
    async healthCheck() {
        try {
            await this.pool.query('SELECT 1');
            const llmHealth = await this.llmService.healthCheck();
            return {
                status: 'healthy',
                database: 'connected',
                llmService: llmHealth.status,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}
module.exports = AutoKlärfallService;
//# sourceMappingURL=autoKl%C3%A4rfallService.js.map