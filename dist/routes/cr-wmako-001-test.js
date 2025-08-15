const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const LLMDataExtractionService = require('../services/llmDataExtractionService');
const AutoKlärfallService = require('../services/autoKlärfallService');
const { ImapEmailService } = require('../services/imapEmailService');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
/**
 * GET /api/cr-wmako-001/test
 * Simple test endpoint to verify CR-WMAKO-001 implementation
 */
router.get('/test', async (req, res) => {
    try {
        const response = {
            success: true,
            message: 'CR-WMAKO-001 implementation is active',
            timestamp: new Date().toISOString(),
            features: {
                imapEmailService: true,
                llmDataExtraction: true,
                autoKlärfallService: true,
                bulkClarifications: true,
                teamEmailConfig: true
            },
            endpoints: {
                health: '/api/cr-wmako-001/health',
                status: '/api/cr-wmako-001/status',
                testLlmExtraction: '/api/cr-wmako-001/test-llm-extraction (POST)',
                testAutoClarification: '/api/cr-wmako-001/test-auto-clarification (POST)',
                teamEmailConfig: '/api/team-email-config',
                bulkClarifications: '/api/bulk-clarifications'
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('CR-WMAKO-001 test endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/cr-wmako-001/health
 * Health Check für alle CR-WMAKO-001 Services
 */
router.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            timestamp: new Date().toISOString(),
            services: {}
        };
        // Database Health Check
        try {
            await pool.query('SELECT 1');
            healthStatus.services.database = { status: 'healthy', message: 'Connected' };
        }
        catch (error) {
            healthStatus.services.database = { status: 'unhealthy', error: error.message };
        }
        // LLM Service Health Check
        try {
            const llmService = new LLMDataExtractionService();
            const llmHealth = await llmService.healthCheck();
            healthStatus.services.llm = llmHealth;
        }
        catch (error) {
            healthStatus.services.llm = { status: 'unhealthy', error: error.message };
        }
        // Auto Klärfall Service Health Check
        try {
            const autoKlärfallService = new AutoKlärfallService();
            const autoHealth = await autoKlärfallService.healthCheck();
            healthStatus.services.autoKlärfall = autoHealth;
        }
        catch (error) {
            healthStatus.services.autoKlärfall = { status: 'unhealthy', error: error.message };
        }
        // IMAP Service Health Check
        try {
            const imapService = new ImapEmailService();
            const imapHealth = imapService.getHealthStatus();
            healthStatus.services.imap = { ...imapHealth, status: 'healthy' };
        }
        catch (error) {
            healthStatus.services.imap = { status: 'unhealthy', error: error.message };
        }
        // Overall Status
        const allHealthy = Object.values(healthStatus.services).every(service => service.status === 'healthy');
        healthStatus.overall = allHealthy ? 'healthy' : 'degraded';
        res.json(healthStatus);
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            overall: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/cr-wmako-001/status
 * Status aller CR-WMAKO-001 Features
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            timestamp: new Date().toISOString(),
            features: {}
        };
        // Check Tables
        const tableChecks = [
            'team_email_configs',
            'email_processing_queue',
            'bulk_clarification_items',
            'clarification_llm_extractions',
            'clarification_references',
            'clarification_drafts',
            'llm_suggestion_cache'
        ];
        for (const table of tableChecks) {
            try {
                const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                status.features[table] = {
                    status: 'available',
                    records: parseInt(result.rows[0].count)
                };
            }
            catch (error) {
                status.features[table] = {
                    status: 'missing',
                    error: error.message
                };
            }
        }
        // Check new columns in bilateral_clarifications
        try {
            const result = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'bilateral_clarifications' 
                AND column_name IN ('type', 'auto_created', 'original_email', 'estimated_effort', 'assigned_to')
            `);
            status.features.bilateral_clarifications_columns = {
                status: 'available',
                columns: result.rows.map(row => row.column_name)
            };
        }
        catch (error) {
            status.features.bilateral_clarifications_columns = {
                status: 'error',
                error: error.message
            };
        }
        res.json(status);
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * POST /api/cr-wmako-001/test-llm-extraction
 * Test der LLM-Datenextraktion
 */
router.post('/test-llm-extraction', async (req, res) => {
    try {
        const { emailText, teamId = 'test-team' } = req.body;
        if (!emailText) {
            return res.status(400).json({ error: 'emailText ist erforderlich' });
        }
        const llmService = new LLMDataExtractionService();
        const testEmail = {
            subject: 'Test E-Mail',
            text: emailText,
            from: 'test@example.com',
            date: new Date()
        };
        const extractedData = await llmService.extractDataFromEmail(testEmail, teamId);
        res.json({
            success: true,
            input: { emailText, teamId },
            extracted: extractedData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('LLM extraction test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * POST /api/cr-wmako-001/test-auto-clarification
 * Test der automatischen Klärfall-Erstellung
 */
router.post('/test-auto-clarification', async (req, res) => {
    try {
        const { emailData, teamId } = req.body;
        if (!emailData || !teamId) {
            return res.status(400).json({ error: 'emailData und teamId sind erforderlich' });
        }
        // Erst LLM-Extraktion
        const llmService = new LLMDataExtractionService();
        const extractedData = await llmService.extractDataFromEmail(emailData, teamId);
        // Dann Auto-Klärfall (im Test-Modus)
        console.log('Extracted data for test:', extractedData);
        res.json({
            success: true,
            emailData,
            extractedData,
            note: 'Test-Modus: Klärfall wurde nicht wirklich erstellt',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Auto clarification test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
module.exports = router;
//# sourceMappingURL=cr-wmako-001-test.js.map