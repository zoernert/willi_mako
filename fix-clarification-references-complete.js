// Fix for missing reference_data column in clarification_references table
// Created: August 20, 2025

const { Pool } = require('pg');
require('dotenv').config();

async function fixClarificationReferencesTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking clarification_references table for reference_data column...');
    
    // Check if the column exists
    const columnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clarification_references' 
        AND column_name = 'reference_data'
      );
    `);
    
    const columnExists = columnExistsResult.rows[0].exists;
    
    if (!columnExists) {
      console.log('Column reference_data does not exist, adding it...');
      await pool.query(`
        ALTER TABLE clarification_references 
        ADD COLUMN reference_data JSONB;
      `);
      console.log('✅ Column reference_data added successfully!');
    } else {
      console.log('✅ Column reference_data already exists.');
    }
    
    // Verify all required columns
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'clarification_references';
    `);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    console.log('Current columns in clarification_references:', columns);
    
    const requiredColumns = ['id', 'clarification_id', 'reference_type', 'reference_id', 'reference_data', 'created_at'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist in the table.');
    } else {
      console.log('⚠️ Still missing columns:', missingColumns);
      
      // Add any missing columns
      for (const col of missingColumns) {
        let dataType = 'TEXT';
        
        if (col === 'id') {
          // Special case for primary key
          await pool.query(`
            ALTER TABLE clarification_references 
            ADD COLUMN ${col} SERIAL PRIMARY KEY;
          `);
        } else if (col === 'clarification_id') {
          await pool.query(`
            ALTER TABLE clarification_references 
            ADD COLUMN ${col} INTEGER REFERENCES bilateral_clarifications(id) ON DELETE CASCADE;
          `);
        } else if (col === 'reference_data') {
          await pool.query(`
            ALTER TABLE clarification_references 
            ADD COLUMN ${col} JSONB;
          `);
        } else if (col === 'created_at') {
          await pool.query(`
            ALTER TABLE clarification_references 
            ADD COLUMN ${col} TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          `);
        } else {
          await pool.query(`
            ALTER TABLE clarification_references 
            ADD COLUMN ${col} VARCHAR(255);
          `);
        }
        console.log(`✅ Added missing column: ${col}`);
      }
    }
    
    // As a final step, let's recreate the table if it's missing essential constraints
    // This is a more thorough approach to ensure the table is properly set up
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clarification_references'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    
    if (tableExists) {
      console.log('Table exists, checking for foreign key constraint...');
      
      // Check if the foreign key constraint exists
      const fkExistsResult = await pool.query(`
        SELECT COUNT(*) FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'clarification_references'
        AND constraint_type = 'FOREIGN KEY';
      `);
      
      const fkExists = parseInt(fkExistsResult.rows[0].count) > 0;
      
      if (!fkExists) {
        console.log('⚠️ Foreign key constraint missing, attempting to add it...');
        try {
          await pool.query(`
            ALTER TABLE clarification_references
            ADD CONSTRAINT fk_clarification_id
            FOREIGN KEY (clarification_id)
            REFERENCES bilateral_clarifications(id)
            ON DELETE CASCADE;
          `);
          console.log('✅ Foreign key constraint added successfully!');
        } catch (fkError) {
          console.error('Error adding foreign key constraint:', fkError);
        }
      } else {
        console.log('✅ Foreign key constraint exists.');
      }
    }
    
    console.log('Script completed successfully.');
  } catch (error) {
    console.error('Error fixing table:', error);
  } finally {
    await pool.end();
  }
}

fixClarificationReferencesTable();
