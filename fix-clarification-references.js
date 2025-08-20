// Fix for missing reference_id column in clarification_references table
// Created: August 20, 2025

const { Pool } = require('pg');
require('dotenv').config();

async function fixClarificationReferencesTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking clarification_references table...');
    
    // First check if the table exists
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clarification_references'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('Table clarification_references does not exist, creating it...');
      await pool.query(`
        CREATE TABLE clarification_references (
          id SERIAL PRIMARY KEY,
          clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
          reference_type VARCHAR(50) NOT NULL, -- 'CHAT', 'MESSAGE_ANALYZER', 'EMAIL', etc.
          reference_id VARCHAR(255) NOT NULL,  -- External identifier (chatId, messageId, etc.)
          reference_data JSONB,                -- Additional context data
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_clarification_references_clarification_id 
          ON clarification_references(clarification_id);
        CREATE INDEX idx_clarification_references_reference_type 
          ON clarification_references(reference_type);
        CREATE INDEX idx_clarification_references_reference_id 
          ON clarification_references(reference_id);
      `);
      console.log('✅ Table created successfully!');
    } else {
      // Check if reference_id column exists
      const columnExistsResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'clarification_references' 
          AND column_name = 'reference_id'
        );
      `);
      
      const columnExists = columnExistsResult.rows[0].exists;
      
      if (!columnExists) {
        console.log('Column reference_id does not exist, adding it...');
        await pool.query(`
          ALTER TABLE clarification_references 
          ADD COLUMN reference_id VARCHAR(255) NOT NULL DEFAULT 'unknown';
          
          CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_id 
            ON clarification_references(reference_id);
        `);
        console.log('✅ Column added successfully!');
      } else {
        console.log('✅ Column reference_id already exists.');
      }
    }
    
    // Verify the result
    const verifyResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clarification_references' 
        AND column_name = 'reference_id'
      );
    `);
    
    const columnExists = verifyResult.rows[0].exists;
    
    if (columnExists) {
      console.log('✅ Confirmed: reference_id column exists in clarification_references table');
    } else {
      console.log('❌ Error: reference_id column still missing from clarification_references table');
    }
    
    console.log('Script completed successfully.');
  } catch (error) {
    console.error('Error fixing table:', error);
  } finally {
    await pool.end();
  }
}

fixClarificationReferencesTable();
