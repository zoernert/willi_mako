const express = require('express');
const router = express.Router();
const ImapScheduler = require('../services/imapScheduler');
// Globaler IMAP-Scheduler
let scheduler = null;
/**
 * GET /api/imap/status
 * Status des IMAP-Schedulers abrufen
 */
router.get('/status', async (req, res) => {
    try {
        if (!scheduler) {
            return res.json({
                success: true,
                status: {
                    isRunning: false,
                    monitoredTeams: [],
                    totalTeams: 0
                }
            });
        }
        const status = scheduler.getStatus();
        res.json({
            success: true,
            status
        });
    }
    catch (error) {
        console.error('Error getting IMAP status:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});
/**
 * POST /api/imap/start
 * IMAP-Scheduler starten
 */
router.post('/start', async (req, res) => {
    try {
        if (!scheduler) {
            scheduler = new ImapScheduler();
        }
        if (scheduler.isRunning) {
            return res.json({
                success: true,
                message: 'IMAP Scheduler is already running',
                status: scheduler.getStatus()
            });
        }
        await scheduler.start();
        res.json({
            success: true,
            message: 'IMAP Scheduler started successfully',
            status: scheduler.getStatus()
        });
    }
    catch (error) {
        console.error('Error starting IMAP scheduler:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});
/**
 * POST /api/imap/stop
 * IMAP-Scheduler stoppen
 */
router.post('/stop', async (req, res) => {
    try {
        if (!scheduler || !scheduler.isRunning) {
            return res.json({
                success: true,
                message: 'IMAP Scheduler is not running'
            });
        }
        await scheduler.stop();
        res.json({
            success: true,
            message: 'IMAP Scheduler stopped successfully'
        });
    }
    catch (error) {
        console.error('Error stopping IMAP scheduler:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});
/**
 * POST /api/imap/restart
 * IMAP-Scheduler neu starten
 */
router.post('/restart', async (req, res) => {
    try {
        if (scheduler && scheduler.isRunning) {
            await scheduler.stop();
        }
        if (!scheduler) {
            scheduler = new ImapScheduler();
        }
        await scheduler.start();
        res.json({
            success: true,
            message: 'IMAP Scheduler restarted successfully',
            status: scheduler.getStatus()
        });
    }
    catch (error) {
        console.error('Error restarting IMAP scheduler:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});
/**
 * POST /api/imap/teams/:teamId/add
 * Team zur IMAP-Überwachung hinzufügen
 */
router.post('/teams/:teamId/add', async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!scheduler) {
            scheduler = new ImapScheduler();
        }
        if (!scheduler.isRunning) {
            return res.status(400).json({
                success: false,
                error: { message: 'IMAP Scheduler is not running. Start it first.' }
            });
        }
        await scheduler.addTeamMonitoring(parseInt(teamId));
        res.json({
            success: true,
            message: `Team ${teamId} added to IMAP monitoring`,
            status: scheduler.getStatus()
        });
    }
    catch (error) {
        console.error('Error adding team to IMAP monitoring:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});
/**
 * DELETE /api/imap/teams/:teamId
 * Team von IMAP-Überwachung entfernen
 */
router.delete('/teams/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!scheduler || !scheduler.isRunning) {
            return res.status(400).json({
                success: false,
                error: { message: 'IMAP Scheduler is not running' }
            });
        }
        await scheduler.removeTeamMonitoring(parseInt(teamId));
        res.json({
            success: true,
            message: `Team ${teamId} removed from IMAP monitoring`,
            status: scheduler.getStatus()
        });
    }
    catch (error) {
        console.error('Error removing team from IMAP monitoring:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});
/**
 * GET /api/imap/health
 * Health-Check für IMAP-Service
 */
router.get('/health', async (req, res) => {
    try {
        const status = scheduler ? scheduler.getStatus() : { isRunning: false };
        res.json({
            success: true,
            service: 'IMAP Scheduler',
            status: status.isRunning ? 'running' : 'stopped',
            details: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error in IMAP health check:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});
module.exports = router;
//# sourceMappingURL=imap-scheduler.js.map