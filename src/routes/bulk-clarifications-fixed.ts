import express from 'express';
import { Pool } from 'pg';
import AutoKlärfallService from '../services/autoKlärfallService.js';
import LLMDataExtractionService from '../services/llmDataExtractionService.js';
import { TeamService } from '../services/teamService.js';

const router = express.Router();
const teamService = new TeamService();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const autoKlärfallService = new AutoKlärfallService();
const llmService = new LLMDataExtractionService();

// Hilfsfunktion: Aktualisiert den Gesamt-Status einer Bulk-Klärung basierend auf Einträgen
async function updateBulkClarificationStatus(clarificationId: string, client: any) {
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
}

// Hilfsfunktion zur Berechtigungsprüfung
async function hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
    try {
        return await teamService.hasTeamAccess(userId, teamId);
    } catch (error) {
        console.error('Error checking team access:', error);
        return false;
    }
}

// Hilfsfunktion zur Klärfall-Zugriff-Prüfung
async function getClarificationWithAccess(clarificationId: string, userId: string) {
    try {
        const result = await pool.query(`
            SELECT c.*, t.name as team_name
            FROM clarifications c
            LEFT JOIN teams t ON c.team_id = t.id
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE c.id = $1 AND (tm.user_id = $2 OR c.created_by = $3)
        `, [clarificationId, userId, userId]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error checking clarification access:', error);
        return null;
    }
}

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
        if (!await hasTeamAccess(req.user?.id, teamId)) {
            return res.status(403).json({ error: 'Keine Berechtigung für dieses Team' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Bulk-Klärung erstellen
            const clarificationResult = await client.query(`
                INSERT INTO clarifications (
                    title,
                    description,
                    type,
                    category,
                    priority,
                    status,
                    team_id,
                    market_partner_id,
                    created_by,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, 'sammelklärung', $3, $4, 'offen', $5, $6, $7, NOW(), NOW())
                RETURNING id
            `, [title, description, category, priority, teamId, marketPartnerId, req.user?.id]);

            const clarificationId = clarificationResult.rows[0].id;

            // Bulk-Einträge erstellen
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await client.query(`
                    INSERT INTO bulk_clarification_items (
                        bulk_clarification_id,
                        item_index,
                        title,
                        description,
                        status,
                        created_at
                    ) VALUES ($1, $2, $3, $4, 'offen', NOW())
                `, [clarificationId, i + 1, item.title, item.description]);
            }

            // Aktivität protokollieren
            await client.query(`
                INSERT INTO clarification_activities (
                    clarification_id,
                    activity_type,
                    description,
                    created_by,
                    created_at,
                    metadata
                ) VALUES ($1, 'bulk_created', $2, $3, NOW(), $4)
            `, [
                clarificationId,
                `Bulk-Klärung mit ${items.length} Einträgen erstellt`,
                req.user?.id,
                JSON.stringify({ itemCount: items.length })
            ]);

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Bulk-Klärung erfolgreich erstellt',
                clarificationId,
                itemCount: items.length
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
        const { page = '1', limit = '20', status } = req.query;

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user?.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        if (clarification.type !== 'sammelklärung') {
            return res.status(400).json({ error: 'Nicht eine Bulk-Klärung' });
        }

        // Einträge laden
        let whereClause = 'WHERE bci.bulk_clarification_id = $1';
        const params: any[] = [id];

        if (status) {
            whereClause += ' AND bci.status = $2';
            params.push(String(status));
        }

        const pageNum = parseInt(String(page));
        const limitNum = parseInt(String(limit));
        const offset = (pageNum - 1) * limitNum;
        
        const query = `
            SELECT 
                bci.*,
                COUNT(*) OVER() as total_count
            FROM bulk_clarification_items bci
            ${whereClause}
            ORDER BY bci.item_index ASC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        params.push(limitNum, offset);
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

        const stats = statsResult.rows.reduce((acc: any, row: any) => {
            acc[row.status] = parseInt(row.count);
            return acc;
        }, {});

        res.json({
            items: result.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: result.rows[0]?.total_count || 0,
                totalPages: Math.ceil((result.rows[0]?.total_count || 0) / limitNum)
            },
            stats
        });

    } catch (error) {
        console.error('Error loading bulk clarification items:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Bulk-Einträge' });
    }
});

/**
 * PUT /api/clarifications/:id/bulk-items/:itemId
 * Aktualisiert einen Bulk-Eintrag
 */
router.put('/:id/bulk-items/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { title, description, status } = req.body;

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user?.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        if (clarification.type !== 'sammelklärung') {
            return res.status(400).json({ error: 'Nicht eine Bulk-Klärung' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Eintrag aktualisieren
            const updateResult = await client.query(`
                UPDATE bulk_clarification_items 
                SET title = $1, description = $2, status = $3, updated_at = NOW()
                WHERE id = $4 AND bulk_clarification_id = $5
                RETURNING *
            `, [title, description, status, itemId, id]);

            const updatedItem = updateResult.rows[0];
            if (!updatedItem) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Eintrag nicht gefunden' });
            }

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
                req.user?.id,
                JSON.stringify({ itemId, changes: { title, description, status } })
            ]);

            // Gesamt-Status der Bulk-Klärung prüfen und ggf. aktualisieren
            await updateBulkClarificationStatus(id, client);

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
        console.error('Error updating bulk clarification item:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Eintrags' });
    }
});

/**
 * POST /api/clarifications/:id/bulk-batch-update
 * Batch-Update für mehrere Bulk-Einträge
 */
router.post('/:id/bulk-batch-update', async (req, res) => {
    try {
        const { id } = req.params;
        const { itemIds, updates } = req.body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ error: 'Mindestens eine Item-ID erforderlich' });
        }

        if (itemIds.length > 50) {
            return res.status(400).json({ error: 'Maximal 50 Einträge pro Batch-Update' });
        }

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user?.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        if (clarification.type !== 'sammelklärung') {
            return res.status(400).json({ error: 'Nicht eine Bulk-Klärung' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let updateQuery = 'UPDATE bulk_clarification_items SET updated_at = NOW()';
            const updateParams: any[] = [];
            let paramIndex = 1;

            if (updates.status) {
                updateQuery += `, status = $${paramIndex}`;
                updateParams.push(updates.status);
                paramIndex++;
            }

            if (updates.title) {
                updateQuery += `, title = $${paramIndex}`;
                updateParams.push(updates.title);
                paramIndex++;
            }

            if (updates.description) {
                updateQuery += `, description = $${paramIndex}`;
                updateParams.push(updates.description);
                paramIndex++;
            }

            const placeholders = itemIds.map((_, i) => `$${paramIndex + i}`).join(',');
            updateQuery += ` WHERE id IN (${placeholders}) AND bulk_clarification_id = $${paramIndex + itemIds.length}`;
            
            updateParams.push(...itemIds, id);

            const updateResult = await client.query(updateQuery, updateParams);
            const updatedCount = updateResult.rowCount || 0;

            // Aktivität protokollieren (nur wenn tatsächlich Updates stattgefunden haben)
            if (updatedCount > 0) {
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
                    req.user?.id
                ]);
            }

            // Gesamt-Status der Bulk-Klärung aktualisieren
            await updateBulkClarificationStatus(id, client);

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
        console.error('Error in bulk batch update:', error);
        res.status(500).json({ error: 'Fehler beim Batch-Update' });
    }
});

/**
 * DELETE /api/clarifications/:id/bulk-items/:itemId
 * Löscht einen Bulk-Eintrag
 */
router.delete('/:id/bulk-items/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;

        // Berechtigung prüfen
        const clarification = await getClarificationWithAccess(id, req.user?.id);
        if (!clarification) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }

        if (clarification.type !== 'sammelklärung') {
            return res.status(400).json({ error: 'Nicht eine Bulk-Klärung' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Eintrag löschen
            const deleteResult = await client.query(`
                DELETE FROM bulk_clarification_items 
                WHERE id = $1 AND bulk_clarification_id = $2
                RETURNING item_index
            `, [itemId, id]);

            if (deleteResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Eintrag nicht gefunden' });
            }

            const deletedIndex = deleteResult.rows[0].item_index;

            // Aktivität protokollieren
            await client.query(`
                INSERT INTO clarification_activities (
                    clarification_id,
                    activity_type,
                    description,
                    created_by,
                    created_at,
                    metadata
                ) VALUES ($1, 'bulk_item_deleted', $2, $3, NOW(), $4)
            `, [
                id,
                `Eintrag ${deletedIndex} gelöscht`,
                req.user?.id,
                JSON.stringify({ itemId, deletedIndex })
            ]);

            // Gesamt-Status der Bulk-Klärung aktualisieren
            await updateBulkClarificationStatus(id, client);

            await client.query('COMMIT');

            res.json({ message: 'Eintrag erfolgreich gelöscht' });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error deleting bulk clarification item:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Eintrags' });
    }
});

export default router;
