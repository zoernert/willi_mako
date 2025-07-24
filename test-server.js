// Simple test server for code lookup functionality
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple auth middleware (bypass for testing)
const simpleAuth = (req, res, next) => {
  req.user = { id: 'test-user' };
  next();
};

// Search function
async function searchCodes(query) {
  const client = await pool.connect();
  
  try {
    const searchQuery = query.trim().replace(/\s+/g, ' & ');
    
    // Search BDEW codes
    const bdewResult = await client.query(`
      SELECT code, company_name, code_type, valid_from, valid_to
      FROM bdewcodes
      WHERE search_vector @@ to_tsquery('german', $1)
         OR code ILIKE $2
         OR company_name ILIKE $2
      ORDER BY 
        CASE WHEN code = $3 THEN 1
             WHEN code ILIKE $4 THEN 2
             WHEN company_name ILIKE $4 THEN 3
             ELSE 4
        END,
        company_name
      LIMIT 25
    `, [searchQuery, `%${query}%`, query, `${query}%`]);

    // Search EIC codes
    const eicResult = await client.query(`
      SELECT eic_code as code, eic_long_name as company_name, eic_type as code_type
      FROM eic
      WHERE search_vector @@ to_tsquery('german', $1)
         OR eic_code ILIKE $2
         OR eic_long_name ILIKE $2
         OR display_name ILIKE $2
      ORDER BY 
        CASE WHEN eic_code = $3 THEN 1
             WHEN eic_code ILIKE $4 THEN 2
             WHEN eic_long_name ILIKE $4 THEN 3
             WHEN display_name ILIKE $4 THEN 3
             ELSE 4
        END,
        COALESCE(display_name, eic_long_name)
      LIMIT 25
    `, [searchQuery, `%${query}%`, query, `${query}%`]);

    // Combine results
    const bdewResults = bdewResult.rows.map(row => ({
      code: row.code,
      companyName: row.company_name,
      codeType: row.code_type,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      source: 'bdew'
    }));

    const eicResults = eicResult.rows.map(row => ({
      code: row.code,
      companyName: row.company_name,
      codeType: row.code_type,
      source: 'eic'
    }));

    return [...bdewResults, ...eicResults];
  } finally {
    client.release();
  }
}

// Code lookup routes
app.get('/api/v1/codes/search', simpleAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const results = await searchCodes(q);
    res.json({
      success: true,
      data: {
        results,
        count: results.length,
        query: q
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`🔗 Testing code lookup functionality`);
  console.log(`🔗 Try: http://localhost:${PORT}/api/v1/codes/search?q=660003`);
});
