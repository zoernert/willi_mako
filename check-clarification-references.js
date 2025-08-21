// Check database schema details for clarification_references table
// Created: August 20, 2025

const { Pool } = require('pg');
require('dotenv').config();

async function checkTableDetails() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Detailed check of clarification_references table:');
    
    // Get full table schema
    const tableSchema = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public' AND 
        table_name = 'clarification_references'
      ORDER BY 
        ordinal_position;
    `);
    
    console.log('Table columns:');
    tableSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Get constraints
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE 
        tc.table_schema = 'public' AND 
        tc.table_name = 'clarification_references'
      ORDER BY 
        tc.constraint_name;
    `);
    
    console.log('\nTable constraints:');
    constraints.rows.forEach(constraint => {
      console.log(`- ${constraint.constraint_name} (${constraint.constraint_type}): ${constraint.column_name} ${constraint.foreign_table_name ? `-> ${constraint.foreign_table_name}.${constraint.foreign_column_name}` : ''}`);
    });
    
    // Get indices
    const indices = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        schemaname = 'public' AND
        tablename = 'clarification_references';
    `);
    
    console.log('\nTable indices:');
    indices.rows.forEach(index => {
      console.log(`- ${index.indexname}: ${index.indexdef}`);
    });
    
    // Simple test for insertion
    console.log('\nTesting insertion with all columns:');
    try {
      const testInsert = await pool.query(`
        INSERT INTO clarification_references (
          clarification_id, 
          reference_type, 
          reference_id, 
          reference_value,
          auto_extracted,
          reference_data
        ) VALUES (
          (SELECT id FROM bilateral_clarifications LIMIT 1),
          'TEST',
          'test-id',
          'test-value',
          false,
          '{"test": "data"}'::jsonb
        ) RETURNING id;
      `);
      
      console.log(`✅ Test insertion successful, id: ${testInsert.rows[0].id}`);
      
      // Clean up test data
      await pool.query(`DELETE FROM clarification_references WHERE reference_type = 'TEST'`);
      console.log('Test data cleaned up');
    } catch (insertError) {
      console.error('❌ Test insertion failed:', insertError.message);
    }
    
    console.log('\nCheck completed successfully.');
  } catch (error) {
    console.error('Error checking table details:', error);
  } finally {
    await pool.end();
  }
}

checkTableDetails();
