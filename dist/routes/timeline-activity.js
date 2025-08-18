"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const TimelineActivityService_1 = require("../services/TimelineActivityService");
const logger_1 = require("../lib/logger");
const router = express_1.default.Router();
const timelineService = new TimelineActivityService_1.TimelineActivityService(database_1.default);
// Type assertion helper for authenticated requests
const getAuthUser = (req) => req.user;
/**
 * Zentrale API für Timeline-Activity-Capture
 * POST /api/timeline-activity/capture
 */
router.post('/capture', auth_1.authenticateToken, async (req, res) => {
    try {
        const { timelineId, feature, activityType, rawData, priority } = req.body;
        const userId = getAuthUser(req).id;
        // Validierung
        if (!timelineId || !feature || !activityType) {
            return res.status(400).json({
                error: 'timelineId, feature, and activityType are required'
            });
        }
        // Prüfen ob Timeline dem User gehört
        const timelineCheck = await database_1.default.query('SELECT id FROM timelines WHERE id = $1 AND user_id = $2 AND is_archived = false', [timelineId, userId]);
        if (timelineCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Timeline not found or not accessible'
            });
        }
        // Activity über Service erfassen (asynchron)
        const activityId = await timelineService.captureActivity({
            timelineId,
            feature,
            activityType,
            rawData: rawData || {},
            priority: priority || 5
        });
        logger_1.logger.info('Timeline activity captured', {
            activityId,
            timelineId,
            feature,
            activityType,
            userId
        });
        res.status(201).json({
            activityId,
            status: 'captured',
            message: 'Activity is being processed in background'
        });
    }
    catch (error) {
        logger_1.logger.error('Error capturing timeline activity', { error: error.message });
        res.status(500).json({ error: 'Failed to capture activity' });
    }
});
/**
 * Activity-Status abrufen
 * GET /api/timeline-activity/:id/status
 */
router.get('/:id/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getAuthUser(req).id;
        const result = await database_1.default.query(`
      SELECT ta.processing_status, ta.created_at, ta.processed_at,
             tpq.status as queue_status, tpq.retry_count, tpq.error_message
      FROM timeline_activities ta
      LEFT JOIN timeline_processing_queue tpq ON ta.id = tpq.activity_id
      LEFT JOIN timelines t ON ta.timeline_id = t.id
      WHERE ta.id = $1 AND t.user_id = $2
    `, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        logger_1.logger.error('Error fetching activity status', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch activity status' });
    }
});
/**
 * Activity löschen
 * DELETE /api/timeline-activity/:id
 */
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getAuthUser(req).id;
        // Prüfen ob Activity dem User gehört (über Timeline)
        const result = await database_1.default.query(`
      UPDATE timeline_activities 
      SET is_deleted = true, deleted_at = NOW()
      FROM timelines 
      WHERE timeline_activities.id = $1 
        AND timeline_activities.timeline_id = timelines.id 
        AND timelines.user_id = $2
        AND timeline_activities.is_deleted = false
      RETURNING timeline_activities.id
    `, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found or not authorized' });
        }
        logger_1.logger.info('Timeline activity deleted', {
            activityId: id,
            userId
        });
        res.json({
            success: true,
            message: 'Activity deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting activity', { error: error.message });
        res.status(500).json({ error: 'Failed to delete activity' });
    }
});
exports.default = router;
//# sourceMappingURL=timeline-activity.js.map