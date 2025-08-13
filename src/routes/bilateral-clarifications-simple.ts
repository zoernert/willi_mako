// Simplified Express Router für Bilaterale Klärfälle API
// Temporary fix to get the server running

import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Simple GET endpoint that should work
router.get('/', async (req, res) => {
  try {
    // Simple query to test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    
    // Return the structure the frontend expects
    res.json({
      clarifications: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
      summary: {
        totalOpen: 0,
        totalInProgress: 0,
        totalResolved: 0,
        totalClosed: 0,
        overdueCases: 0,
        highPriorityCases: 0
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      error: 'Fehler beim Laden der Klärfälle',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple POST endpoint
router.post('/', async (req, res) => {
  try {
    res.json({
      message: 'POST endpoint working',
      received: req.body
    });
  } catch (error) {
    res.status(500).json({
      error: 'Fehler beim Erstellen',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
