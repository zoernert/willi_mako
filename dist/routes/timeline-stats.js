"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Timeline Stats für Dashboard Widget - Root-Route
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // User ist durch authenticateToken garantiert
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
        const userId = req.user.id;
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
// Timeline PDF-Export (einfach als JSON für jetzt)
router.get('/:id/export', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
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
        // Einfacher Text-Export (später kann PDF-Generation implementiert werden)
        const exportData = {
            timeline,
            activities: activitiesResult.rows,
            exported_at: new Date().toISOString(),
            exported_by: req.user.email
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="timeline-${timeline.name}-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
    }
    catch (error) {
        console.error('Error exporting timeline:', error);
        res.status(500).json({ error: 'Failed to export timeline' });
    }
});
// Activity retry endpoint
router.post('/activities/:id/retry', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Prüfen ob Activity existiert und dem User gehört
        const activityResult = await database_1.default.query(`
      SELECT ta.*, t.user_id
      FROM timeline_activities ta
      JOIN timelines t ON ta.timeline_id = t.id
      WHERE ta.id = $1 AND t.user_id = $2
    `, [id, userId]);
        if (activityResult.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        const activity = activityResult.rows[0];
        if (activity.processing_status !== 'failed') {
            return res.status(400).json({ error: 'Activity is not in failed state' });
        }
        // Activity wieder in Queue einreihen
        await database_1.default.query(`
      INSERT INTO timeline_processing_queue (
        activity_id, 
        raw_data, 
        prompt_template, 
        priority,
        retry_count,
        status
      ) VALUES ($1, $2, $3, $4, 0, 'queued')
      ON CONFLICT (activity_id) DO UPDATE SET
        status = 'queued',
        retry_count = 0,
        error_message = NULL,
        created_at = NOW()
    `, [
            id,
            activity.metadata || {},
            `${activity.feature_name}:${activity.activity_type}`,
            1 // Hohe Priorität für Retries
        ]);
        // Activity Status zurücksetzen
        await database_1.default.query(`
      UPDATE timeline_activities 
      SET processing_status = 'pending'
      WHERE id = $1
    `, [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error retrying activity:', error);
        res.status(500).json({ error: 'Failed to retry activity' });
    }
});
exports.default = router;
//# sourceMappingURL=timeline-stats.js.map