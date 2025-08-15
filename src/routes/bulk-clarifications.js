const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const AutoKlärfallService = require('../services/autoKlärfallService');
const LLMDataExtractionService = require('../services/llmDataExtractionService');

// Team service functions - simplified for direct use
const teamService = {
    async hasTeamAccess(userId, teamId) {
        const query = `
            SELECT 1 FROM team_members 
            WHERE user_id = $1 AND team_id = $2
            UNION
            SELECT 1 FROM teams 
            WHERE id = $2 AND owner_id = $1
        `;
        const result = await pool.query(query, [userId, teamId]);
        return result.rows.length > 0;
    }
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const autoKlärfallService = new AutoKlärfallService();
const llmService = new LLMDataExtractionService();

/**
 * POST /api/clarifications/bulk
 * Erstellt neue Bulk-Klärung
 */
router.post('/bulk', async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            priority,
            teamId,
            marketPartnerId,
            items
        } = req.body;

        // Validierung
        if (!title || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Titel und mindestens ein Eintrag sind erforderlich' 
            });
        }

        if (items.length > 100) {
            return res.status(400).json({ 
                error: 'Maximal 100 Einträge pro Bulk-Klärung erlaubt' 
            });
        }

        // Berechtigung prüfen
        if (!await hasTeamAccess(req.user.id, teamId)) {
            return res.status(403).json({ error: 'Keine Berechtigung für dieses Team' });
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Haupt-Klärfall erstellen
            const mainClarificationResult = await client.query(`
                INSERT INTO clarifications (
                    title,
                    description,
                    category,
                    priority,
                    type,
                    status,
                    team_id,
                    market_partner_id,
                    created_by,
                    created_at
                ) VALUES ($1, $2, $3, $4, 'sammelklärung', 'offen', $5, $6, $7, NOW())
                RETURNING *
            `, [
                title,
                description,
                category || 'general',
                priority || 'normal',
                teamId,
                marketPartnerId,
                req.user.id
            ]);

            const mainClarification = mainClarificationResult.rows[0];

            // Einzeleinträge erstellen
            const createdItems = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                
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
                    item.description || '',
                    JSON.stringify(item.references || {})
                ]);

                createdItems.push(itemResult.rows[0]);
            }

            // Aktivität protokollieren
            await client.query(`
                INSERT INTO clarification_activities (
                    clarification_id,
                    activity_type,
                    description,
                    created_by,
                    created_at
                ) VALUES ($1, 'bulk_created', $2, $3, NOW())
            `, [
                mainClarification.id,
                `Bulk-Klärung mit ${items.length} Einträgen erstellt`,
                req.user.id
            ]);

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Bulk-Klärung erfolgreich erstellt',
                clarification: {
                    ...mainClarification,
                    items: createdItems
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error creating bulk clarification:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen der Bulk-Klärung' });
    }
});

/**
 * GET /api/clarifications/:id/bulk-items
 * Lädt Einträge einer Bulk-Klärung
 */
router.get('/:id/bulk-items', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20, status } = req.query;

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        if (clarification.type !== 'sammelklärung') {
            return res.status(400).json({ error: 'Nicht eine Bulk-Klärung' });
        }

        // Einträge laden
        let whereClause = 'WHERE bci.bulk_clarification_id = $1';
        const params = [id];

        if (status) {
            whereClause += ' AND bci.status = $2';
            params.push(status);
        }

        const offset = (page - 1) * limit;
        const query = `
            SELECT 
                bci.*,
                COUNT(*) OVER() as total_count
            FROM bulk_clarification_items bci
            ${whereClause}
            ORDER BY bci.item_index ASC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        params.push(limit, offset);
        const result = await pool.query(query, params);

        // Statistiken laden
        const statsResult = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM bulk_clarification_items
            WHERE bulk_clarification_id = $1
            GROUP BY status
        `, [id]);

        const stats = statsResult.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
        }, {});

        res.json({
            items: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows[0]?.total_count || 0,
                totalPages: Math.ceil((result.rows[0]?.total_count || 0) / limit)
            },
            stats
        });

    } catch (error) {
        console.error('Error loading bulk items:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Einträge' });
    }
});

/**
 * PUT /api/clarifications/:id/bulk-items/:itemId
 * Aktualisiert einzelnen Bulk-Eintrag
 */
router.put('/:id/bulk-items/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { title, description, status, referenceData, notes } = req.body;

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Eintrag aktualisieren
            const updateResult = await client.query(`
                UPDATE bulk_clarification_items 
                SET 
                    title = COALESCE($1, title),
                    description = COALESCE($2, description),
                    status = COALESCE($3, status),
                    reference_data = COALESCE($4, reference_data),
                    notes = COALESCE($5, notes),
                    updated_at = NOW(),
                    updated_by = $6
                WHERE id = $7 AND bulk_clarification_id = $8
                RETURNING *
            `, [
                title,
                description,
                status,
                referenceData ? JSON.stringify(referenceData) : null,
                notes,
                req.user.id,
                itemId,
                id
            ]);

            if (updateResult.rows.length === 0) {
                throw new Error('Eintrag nicht gefunden');
            }

            const updatedItem = updateResult.rows[0];

            // Aktivität protokollieren
            await client.query(`
                INSERT INTO clarification_activities (
                    clarification_id,
                    activity_type,
                    description,
                    created_by,
                    created_at,
                    metadata
                ) VALUES ($1, 'bulk_item_updated', $2, $3, NOW(), $4)
            `, [
                id,
                `Eintrag ${updatedItem.item_index} aktualisiert`,
                req.user.id,
                JSON.stringify({ itemId, changes: { title, description, status } })
            ]);

            // Gesamt-Status der Bulk-Klärung prüfen und ggf. aktualisieren
            await this.updateBulkClarificationStatus(id, client);

            await client.query('COMMIT');

            res.json({
                message: 'Eintrag erfolgreich aktualisiert',
                item: updatedItem
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error updating bulk item:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Eintrags' });
    }
});

/**
 * POST /api/clarifications/:id/bulk-items/batch-update
 * Aktualisiert mehrere Bulk-Einträge gleichzeitig
 */
router.post('/:id/bulk-items/batch-update', async (req, res) => {
    try {
        const { id } = req.params;
        const { updates, newStatus } = req.body;

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        if ((!updates || !Array.isArray(updates)) && !newStatus) {
            return res.status(400).json({ error: 'Updates oder neuer Status erforderlich' });
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            let updatedCount = 0;

            if (newStatus) {
                // Alle Einträge auf neuen Status setzen
                const result = await client.query(`
                    UPDATE bulk_clarification_items 
                    SET status = $1, updated_at = NOW(), updated_by = $2
                    WHERE bulk_clarification_id = $3
                `, [newStatus, req.user.id, id]);

                updatedCount = result.rowCount;

                await client.query(`
                    INSERT INTO clarification_activities (
                        clarification_id,
                        activity_type,
                        description,
                        created_by,
                        created_at
                    ) VALUES ($1, 'bulk_batch_update', $2, $3, NOW())
                `, [
                    id,
                    `Alle ${updatedCount} Einträge auf Status "${newStatus}" gesetzt`,
                    req.user.id
                ]);

            } else {
                // Spezifische Updates durchführen
                for (const update of updates) {
                    const { itemId, changes } = update;
                    
                    const setClauses = [];
                    const values = [];
                    let paramIndex = 1;

                    Object.entries(changes).forEach(([key, value]) => {
                        if (['title', 'description', 'status', 'notes'].includes(key)) {
                            setClauses.push(`${key} = $${paramIndex}`);
                            values.push(value);
                            paramIndex++;
                        }
                    });

                    if (setClauses.length > 0) {
                        setClauses.push(`updated_at = NOW()`);
                        setClauses.push(`updated_by = $${paramIndex}`);
                        values.push(req.user.id);
                        paramIndex++;

                        values.push(itemId);
                        values.push(id);

                        const updateQuery = `
                            UPDATE bulk_clarification_items 
                            SET ${setClauses.join(', ')}
                            WHERE id = $${paramIndex - 1} AND bulk_clarification_id = $${paramIndex}
                        `;

                        const result = await client.query(updateQuery, values);
                        if (result.rowCount > 0) {
                            updatedCount++;
                        }
                    }
                }

                await client.query(`
                    INSERT INTO clarification_activities (
                        clarification_id,
                        activity_type,
                        description,
                        created_by,
                        created_at
                    ) VALUES ($1, 'bulk_batch_update', $2, $3, NOW())
                `, [
                    id,
                    `${updatedCount} Einträge in Batch-Update aktualisiert`,
                    req.user.id
                ]);
            }

            // Gesamt-Status der Bulk-Klärung aktualisieren
            await this.updateBulkClarificationStatus(id, client);

            await client.query('COMMIT');

            res.json({
                message: `${updatedCount} Einträge erfolgreich aktualisiert`,
                updatedCount
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error in batch update:', error);
        res.status(500).json({ error: 'Fehler beim Batch-Update' });
    }
});

/**
 * POST /api/clarifications/:id/llm-suggestions
 * Generiert LLM-Vorschläge für Klärfall
 */
router.post('/:id/llm-suggestions', async (req, res) => {
    try {
        const { id } = req.params;
        const { context, requestType = 'analysis' } = req.body;

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        // Klärfall-Daten für LLM-Analyse vorbereiten
        const emailData = {
            subject: clarification.title,
            text: clarification.description,
            from: clarification.original_email?.from || 'Unbekannt'
        };

        let suggestions;

        switch (requestType) {
            case 'analysis':
                suggestions = await llmService.extractDataFromEmail(emailData, clarification.team_id);
                break;
            
            case 'response':
                suggestions = await llmService.suggestStandardResponse(emailData, context);
                break;
            
            case 'routing':
                suggestions = await llmService.analyzeForRouting(emailData, context);
                break;
            
            default:
                return res.status(400).json({ error: 'Unbekannter Request-Type' });
        }

        // Vorschläge in Cache speichern
        await pool.query(`
            INSERT INTO llm_suggestion_cache (
                clarification_id,
                request_type,
                suggestions,
                confidence,
                created_by,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
            id,
            requestType,
            JSON.stringify(suggestions),
            suggestions.confidence || 0.5,
            req.user.id
        ]);

        res.json({
            suggestions,
            requestType,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating LLM suggestions:', error);
        res.status(500).json({ error: 'Fehler beim Generieren der Vorschläge' });
    }
});

/**
 * Hilfsfunktionen
 */
async function getClarificationWithAccess(clarificationId, userId) {
    try {
        const result = await pool.query(`
            SELECT c.*, t.name as team_name
            FROM clarifications c
            JOIN teams t ON c.team_id = t.id
            JOIN team_members tm ON t.id = tm.team_id
            WHERE c.id = $1 AND tm.user_id = $2
            LIMIT 1
        `, [clarificationId, userId]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error checking clarification access:', error);
        return null;
    }
}

async function hasTeamAccess(userId, teamId) {
    try {
        const result = await pool.query(`
            SELECT 1 FROM team_members 
            WHERE user_id = $1 AND team_id = $2
        `, [userId, teamId]);
        
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error checking team access:', error);
        return false;
    }
}

// Aktualisiert den Gesamt-Status einer Bulk-Klärung basierend auf Einträgen
router.updateBulkClarificationStatus = async function(clarificationId, client) {
    try {
        const statusResult = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'abgeschlossen' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'in_bearbeitung' THEN 1 END) as in_progress
            FROM bulk_clarification_items
            WHERE bulk_clarification_id = $1
        `, [clarificationId]);

        const stats = statusResult.rows[0];
        let newStatus = 'offen';

        if (stats.completed == stats.total) {
            newStatus = 'abgeschlossen';
        } else if (stats.in_progress > 0 || stats.completed > 0) {
            newStatus = 'in_bearbeitung';
        }

        await client.query(`
            UPDATE clarifications 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
        `, [newStatus, clarificationId]);

    } catch (error) {
        console.error('Error updating bulk clarification status:', error);
        // Nicht kritisch
    }
};

module.exports = router;
