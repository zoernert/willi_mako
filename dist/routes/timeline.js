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
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const TimelineActivityService_1 = require("../services/TimelineActivityService");
const router = express_1.default.Router();
const timelineService = new TimelineActivityService_1.TimelineActivityService(database_1.default);
// Type assertion helper for authenticated requests
const getAuthUser = (req) => req.user;
// Timeline CRUD Operations
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = getAuthUser(req).id;
        const result = await database_1.default.query(`SELECT * FROM timelines 
       WHERE user_id = $1 AND is_archived = false 
       ORDER BY updated_at DESC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching timelines:', error);
        res.status(500).json({ error: 'Failed to fetch timelines' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        const userId = getAuthUser(req).id;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Timeline name is required' });
        }
        if (name.length > 50) {
            return res.status(400).json({ error: 'Timeline name must be 50 characters or less' });
        }
        const result = await database_1.default.query(`INSERT INTO timelines (user_id, name, description) 
       VALUES ($1, $2, $3) RETURNING *`, [userId, name.trim(), description || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating timeline:', error);
        res.status(500).json({ error: 'Failed to create timeline' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = getAuthUser(req).id;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Timeline name is required' });
        }
        if (name.length > 50) {
            return res.status(400).json({ error: 'Timeline name must be 50 characters or less' });
        }
        const result = await database_1.default.query(`UPDATE timelines SET 
       name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4 AND is_archived = false
       RETURNING *`, [name.trim(), description || null, id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating timeline:', error);
        res.status(500).json({ error: 'Failed to update timeline' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getAuthUser(req).id;
        const result = await database_1.default.query(`UPDATE timelines SET 
       is_archived = true, archived_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_archived = false
       RETURNING *`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        res.json({ success: true, message: 'Timeline archived successfully' });
    }
    catch (error) {
        console.error('Error archiving timeline:', error);
        res.status(500).json({ error: 'Failed to archive timeline' });
    }
});
router.put('/:id/activate', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getAuthUser(req).id;
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Deactivate all other timelines for this user
            await client.query('UPDATE timelines SET is_active = false WHERE user_id = $1', [userId]);
            // Activate the selected timeline
            const result = await client.query(`UPDATE timelines SET 
         is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_archived = false
         RETURNING *`, [id, userId]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Timeline not found' });
            }
            await client.query('COMMIT');
            res.json(result.rows[0]);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error activating timeline:', error);
        res.status(500).json({ error: 'Failed to activate timeline' });
    }
});
// Timeline Activities
router.get('/:timelineId/activities', auth_1.authenticateToken, async (req, res) => {
    try {
        const { timelineId } = req.params;
        const userId = getAuthUser(req).id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        // Prüfen ob Timeline dem User gehört
        const timelineResult = await database_1.default.query('SELECT id FROM timelines WHERE id = $1 AND user_id = $2', [timelineId, userId]);
        if (timelineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        const offset = (page - 1) * limit;
        const result = await database_1.default.query(`SELECT * FROM timeline_activities 
       WHERE timeline_id = $1 AND is_deleted = false 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`, [timelineId, limit, offset]);
        // Count total activities for pagination
        const countResult = await database_1.default.query(`SELECT COUNT(*) FROM timeline_activities 
       WHERE timeline_id = $1 AND is_deleted = false`, [timelineId]);
        const totalActivities = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalActivities / limit);
        res.json({
            activities: result.rows,
            pagination: {
                page,
                limit,
                totalActivities,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    }
    catch (error) {
        console.error('Error fetching timeline activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});
// Activity deletion
router.delete('/activities/:activityId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { activityId } = req.params;
        const userId = getAuthUser(req).id;
        await timelineService.deleteActivity(activityId, userId);
        res.json({ success: true, message: 'Activity deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting activity:', error);
        if (error.message === 'Activity not found or not authorized') {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to delete activity' });
        }
    }
});
// Activity status
router.get('/activities/:activityId/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const { activityId } = req.params;
        const userId = getAuthUser(req).id;
        const result = await database_1.default.query(`SELECT ta.processing_status, tpq.status as queue_status, tpq.error_message
       FROM timeline_activities ta
       LEFT JOIN timeline_processing_queue tpq ON ta.id = tpq.activity_id
       JOIN timelines t ON ta.timeline_id = t.id
       WHERE ta.id = $1 AND t.user_id = $2`, [activityId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching activity status:', error);
        res.status(500).json({ error: 'Failed to fetch activity status' });
    }
});
// Zentrale Aktivitätserfassung
router.post('/activity/capture', auth_1.authenticateToken, async (req, res) => {
    try {
        const { timelineId, feature, activityType, rawData, priority } = req.body;
        const userId = getAuthUser(req).id;
        // Validation
        if (!timelineId || !feature || !activityType || !rawData) {
            return res.status(400).json({
                error: 'Missing required fields: timelineId, feature, activityType, rawData'
            });
        }
        // Prüfen ob Timeline dem User gehört
        const timelineResult = await database_1.default.query('SELECT id FROM timelines WHERE id = $1 AND user_id = $2 AND is_archived = false', [timelineId, userId]);
        if (timelineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        const activityId = await timelineService.createActivity(timelineId, feature, activityType, rawData, userId, // created_by
        false, // is_milestone
        { priority: priority || 5 } // metadata
        );
        res.status(201).json({ success: true, activityId });
    }
    catch (error) {
        console.error('Error capturing timeline activity:', error);
        res.status(500).json({ error: 'Failed to capture activity' });
    }
});
// Timeline statistics
router.get('/:timelineId/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const { timelineId } = req.params;
        const userId = getAuthUser(req).id;
        // Prüfen ob Timeline dem User gehört
        const timelineResult = await database_1.default.query('SELECT id FROM timelines WHERE id = $1 AND user_id = $2', [timelineId, userId]);
        if (timelineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        // Activity statistics
        const statsResult = await database_1.default.query(`SELECT 
         COUNT(*) as total_activities,
         COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_activities,
         COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending_activities,
         COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed_activities,
         COUNT(DISTINCT feature_name) as unique_features,
         MIN(created_at) as first_activity,
         MAX(created_at) as last_activity
       FROM timeline_activities 
       WHERE timeline_id = $1 AND is_deleted = false`, [timelineId]);
        // Feature breakdown
        const featureBreakdown = await database_1.default.query(`SELECT feature_name, COUNT(*) as count
       FROM timeline_activities 
       WHERE timeline_id = $1 AND is_deleted = false
       GROUP BY feature_name
       ORDER BY count DESC`, [timelineId]);
        res.json({
            ...statsResult.rows[0],
            featureBreakdown: featureBreakdown.rows
        });
    }
    catch (error) {
        console.error('Error fetching timeline stats:', error);
        res.status(500).json({ error: 'Failed to fetch timeline statistics' });
    }
});
// Timeline Stats für Dashboard Widget
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = getAuthUser(req).id;
        // Parallel alle Statistiken laden
        const [timelinesResult, activitiesResult, todayActivitiesResult, weekActivitiesResult, mostActiveResult, recentActivitiesResult, queueResult] = await Promise.all([
            // Timelines-Statistiken
            database_1.default.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_archived = false THEN 1 END) as active,
          COUNT(CASE WHEN is_archived = true THEN 1 END) as archived
        FROM timelines 
        WHERE user_id = $1
      `, [userId]),
            // Aktivitäten-Gesamtzahl
            database_1.default.query(`
        SELECT COUNT(*) as total
        FROM timeline_activities ta
        JOIN timelines t ON ta.timeline_id = t.id
        WHERE t.user_id = $1 AND ta.is_deleted = false
      `, [userId]),
            // Aktivitäten heute
            database_1.default.query(`
        SELECT COUNT(*) as today
        FROM timeline_activities ta
        JOIN timelines t ON ta.timeline_id = t.id
        WHERE t.user_id = $1 
          AND ta.is_deleted = false
          AND ta.created_at >= CURRENT_DATE
      `, [userId]),
            // Aktivitäten diese Woche
            database_1.default.query(`
        SELECT COUNT(*) as week
        FROM timeline_activities ta
        JOIN timelines t ON ta.timeline_id = t.id
        WHERE t.user_id = $1 
          AND ta.is_deleted = false
          AND ta.created_at >= DATE_TRUNC('week', CURRENT_DATE)
      `, [userId]),
            // Aktivste Timeline
            database_1.default.query(`
        SELECT 
          t.id,
          t.name,
          COUNT(ta.id) as activity_count
        FROM timelines t
        LEFT JOIN timeline_activities ta ON t.id = ta.timeline_id AND ta.is_deleted = false
        WHERE t.user_id = $1 AND t.is_archived = false
        GROUP BY t.id, t.name
        ORDER BY activity_count DESC
        LIMIT 1
      `, [userId]),
            // Neueste Aktivitäten
            database_1.default.query(`
        SELECT 
          ta.id,
          t.name as timeline_name,
          ta.feature_name,
          ta.activity_type,
          ta.title,
          ta.created_at
        FROM timeline_activities ta
        JOIN timelines t ON ta.timeline_id = t.id
        WHERE t.user_id = $1 AND ta.is_deleted = false
        ORDER BY ta.created_at DESC
        LIMIT 10
      `, [userId]),
            // Warteschlangen-Status
            database_1.default.query(`
        SELECT COUNT(*) as queue_count
        FROM timeline_processing_queue tpq
        JOIN timeline_activities ta ON tpq.activity_id = ta.id
        JOIN timelines t ON ta.timeline_id = t.id
        WHERE t.user_id = $1 AND tpq.status IN ('queued', 'processing')
      `, [userId])
        ]);
        const stats = {
            total_timelines: parseInt(timelinesResult.rows[0].total),
            active_timelines: parseInt(timelinesResult.rows[0].active),
            archived_timelines: parseInt(timelinesResult.rows[0].archived),
            total_activities: parseInt(activitiesResult.rows[0].total),
            activities_today: parseInt(todayActivitiesResult.rows[0].today),
            activities_this_week: parseInt(weekActivitiesResult.rows[0].week),
            most_active_timeline: mostActiveResult.rows.length > 0 && parseInt(mostActiveResult.rows[0].activity_count) > 0
                ? {
                    id: mostActiveResult.rows[0].id,
                    name: mostActiveResult.rows[0].name,
                    activity_count: parseInt(mostActiveResult.rows[0].activity_count)
                }
                : null,
            recent_activities: recentActivitiesResult.rows.map(row => ({
                id: row.id,
                timeline_name: row.timeline_name,
                activity_type: `${row.feature_name}_${row.activity_type}`,
                title: row.title,
                created_at: row.created_at
            })),
            processing_queue_count: parseInt(queueResult.rows[0].queue_count)
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching timeline stats:', error);
        res.status(500).json({ error: 'Failed to fetch timeline stats' });
    }
});
// Einzelne Timeline abrufen
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getAuthUser(req).id;
        const result = await database_1.default.query(`SELECT * FROM timelines 
       WHERE id = $1 AND user_id = $2`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching timeline:', error);
        res.status(500).json({ error: 'Failed to fetch timeline' });
    }
});
// Timeline bearbeiten
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, is_active } = req.body;
        const userId = getAuthUser(req).id;
        // Prüfen ob Timeline existiert und dem User gehört
        const timelineResult = await database_1.default.query('SELECT id FROM timelines WHERE id = $1 AND user_id = $2', [id, userId]);
        if (timelineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        if (name && (name.trim().length === 0 || name.length > 50)) {
            return res.status(400).json({ error: 'Timeline name must be 1-50 characters' });
        }
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        if (name !== undefined) {
            updateFields.push(`name = $${paramCount++}`);
            updateValues.push(name.trim());
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramCount++}`);
            updateValues.push(description);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramCount++}`);
            updateValues.push(is_active);
        }
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id, userId);
        const result = await database_1.default.query(`UPDATE timelines SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount++} AND user_id = $${paramCount++} 
       RETURNING *`, updateValues);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating timeline:', error);
        res.status(500).json({ error: 'Failed to update timeline' });
    }
});
// Timeline archivieren
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getAuthUser(req).id;
        const result = await database_1.default.query(`UPDATE timelines 
       SET is_archived = true, archived_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error archiving timeline:', error);
        res.status(500).json({ error: 'Failed to archive timeline' });
    }
});
// Timeline als aktiv setzen
router.put('/:id/activate', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getAuthUser(req).id;
        // Zuerst alle anderen Timelines deaktivieren
        await database_1.default.query('UPDATE timelines SET is_active = false WHERE user_id = $1', [userId]);
        // Dann die gewählte Timeline aktivieren
        const result = await database_1.default.query(`UPDATE timelines 
       SET is_active = true, updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error activating timeline:', error);
        res.status(500).json({ error: 'Failed to activate timeline' });
    }
});
// Timeline PDF-Export
router.get('/:id/export', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { format } = req.query;
        const userId = getAuthUser(req).id;
        // Prüfen ob Timeline existiert
        const timelineResult = await database_1.default.query('SELECT * FROM timelines WHERE id = $1 AND user_id = $2', [id, userId]);
        if (timelineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Timeline not found' });
        }
        const timeline = timelineResult.rows[0];
        // Alle Aktivitäten laden
        const activitiesResult = await database_1.default.query(`
      SELECT * FROM timeline_activities 
      WHERE timeline_id = $1 AND is_deleted = false 
      ORDER BY created_at DESC
    `, [id]);
        // Statistiken laden
        const statsResult = await database_1.default.query(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT feature_name) as features_used,
        MIN(created_at) as first_activity,
        MAX(created_at) as last_activity
      FROM timeline_activities 
      WHERE timeline_id = $1 AND is_deleted = false
    `, [id]);
        const exportData = {
            timeline,
            activities: activitiesResult.rows,
            stats: statsResult.rows[0] || {
                total_activities: 0,
                features_used: 0,
                first_activity: null,
                last_activity: null
            },
            exported_at: new Date().toISOString(),
            exported_by: getAuthUser(req).email || getAuthUser(req).username || 'Unbekannt'
        };
        // PDF-Export
        if (format === 'pdf') {
            const { TimelinePDFExportService } = await Promise.resolve().then(() => __importStar(require('../services/TimelinePDFExportService')));
            const pdfService = new TimelinePDFExportService();
            const pdfBuffer = await pdfService.exportTimelineToPDF(exportData);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="timeline-${timeline.name}-${new Date().toISOString().split('T')[0]}.pdf"`);
            res.send(pdfBuffer);
        }
        else {
            // JSON-Export (Standard)
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="timeline-${timeline.name}-${new Date().toISOString().split('T')[0]}.json"`);
            res.json(exportData);
        }
    }
    catch (error) {
        console.error('Error exporting timeline:', error);
        res.status(500).json({ error: 'Failed to export timeline' });
    }
});
exports.default = router;
//# sourceMappingURL=timeline.js.map