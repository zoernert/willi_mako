const express = require('express');
const router = express.Router();
const googleAIKeyManager = require('../services/googleAIKeyManager');
// Fix the middleware import path
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Admin-Route für API-Schlüssel-Nutzungsstatistiken
 * GET /api/admin/api-keys/usage
 */
router.get('/api-keys/usage', authenticateToken, requireAdmin, (req, res) => {
  try {
    const usageMetrics = googleAIKeyManager.getUsageMetrics();
    
    res.json({
      success: true,
      metrics: usageMetrics
    });
  } catch (error) {
    console.error('Error retrieving API key metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der API-Schlüssel-Nutzungsstatistiken',
      error: error.message
    });
  }
});

/**
 * Admin-Route zum Zurücksetzen der API-Schlüssel-Nutzungsstatistiken
 * POST /api/admin/api-keys/usage/reset
 */
router.post('/api-keys/usage/reset', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Überprüfen, ob nur ein bestimmter Schlüsseltyp zurückgesetzt werden soll
    const { keyType } = req.body;
    
    if (keyType && !['free', 'paid', 'all'].includes(keyType)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Schlüsseltyp. Erlaubt sind: free, paid, all'
      });
    }
    
    // Zurücksetzen der Statistiken
    if (!keyType || keyType === 'all') {
      googleAIKeyManager.usageMetrics.free.dailyUsage = {};
      googleAIKeyManager.usageMetrics.free.totalUsage = 0;
      googleAIKeyManager.usageMetrics.free.lastReset = new Date().toISOString();
      
      googleAIKeyManager.usageMetrics.paid.dailyUsage = {};
      googleAIKeyManager.usageMetrics.paid.totalUsage = 0;
      googleAIKeyManager.usageMetrics.paid.lastReset = new Date().toISOString();
    } else if (keyType === 'free') {
      googleAIKeyManager.usageMetrics.free.dailyUsage = {};
      googleAIKeyManager.usageMetrics.free.totalUsage = 0;
      googleAIKeyManager.usageMetrics.free.lastReset = new Date().toISOString();
    } else if (keyType === 'paid') {
      googleAIKeyManager.usageMetrics.paid.dailyUsage = {};
      googleAIKeyManager.usageMetrics.paid.totalUsage = 0;
      googleAIKeyManager.usageMetrics.paid.lastReset = new Date().toISOString();
    }
    
    // Speichern der aktualisierten Metriken
    googleAIKeyManager.saveMetrics()
      .then(() => {
        res.json({
          success: true,
          message: `Nutzungsstatistiken für ${keyType || 'alle'} API-Schlüssel zurückgesetzt`,
          currentMetrics: googleAIKeyManager.getUsageMetrics()
        });
      })
      .catch(error => {
        console.error('Error saving metrics:', error);
        res.status(500).json({
          success: false,
          message: 'Fehler beim Speichern der zurückgesetzten Metriken',
          error: error.message
        });
      });
  } catch (error) {
    console.error('Error resetting API key metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zurücksetzen der API-Schlüssel-Nutzungsstatistiken',
      error: error.message
    });
  }
});

/**
 * Admin-Route zum Aktualisieren der API-Schlüssel-Konfiguration
 * POST /api/admin/api-keys/config
 */
router.post('/api-keys/config', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { dailyLimit, minuteLimit } = req.body;
    
    // Validierung
    if (dailyLimit !== undefined && (isNaN(dailyLimit) || dailyLimit < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Tägliches Limit muss eine positive Zahl sein'
      });
    }
    
    if (minuteLimit !== undefined && (isNaN(minuteLimit) || minuteLimit < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Minütliches Limit muss eine positive Zahl sein'
      });
    }
    
    // Aktualisieren der Limits
    if (dailyLimit !== undefined) {
      googleAIKeyManager.usageCounter.free.dailyLimit = parseInt(dailyLimit);
    }
    
    if (minuteLimit !== undefined) {
      googleAIKeyManager.usageCounter.free.minuteLimit = parseInt(minuteLimit);
    }
    
    res.json({
      success: true,
      message: 'API-Schlüssel-Konfiguration aktualisiert',
      currentConfig: {
        dailyLimit: googleAIKeyManager.usageCounter.free.dailyLimit,
        minuteLimit: googleAIKeyManager.usageCounter.free.minuteLimit
      }
    });
  } catch (error) {
    console.error('Error updating API key configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der API-Schlüssel-Konfiguration',
      error: error.message
    });
  }
});

module.exports = router;
