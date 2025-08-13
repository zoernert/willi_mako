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
    
    res.json({
      message: 'Bilateral clarifications API is working',
      server_time: result.rows[0].current_time,
      clarifications: []
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
