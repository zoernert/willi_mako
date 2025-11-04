const { Pool } = require('pg');

const pool = new Pool({
  host: '10.0.0.2',
  port: 5117,
  database: 'willi_mako',
  user: 'willi_user',
  password: 'willi_password',
});

async function checkDocuments() {
  try {
    // Get user ID
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = 'thorsten.zoerner@stromdao.com'"
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('User ID:', userId);
    
    // Get documents
    const docsResult = await pool.query(
      `SELECT id, title, is_processed, is_ai_context_enabled, 
              processing_error, created_at 
       FROM user_documents 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );
    
    console.log('\nDocuments:', docsResult.rows.length);
    docsResult.rows.forEach((doc, i) => {
      console.log(`\n--- Document ${i + 1} ---`);
      console.log('ID:', doc.id);
      console.log('Title:', doc.title);
      console.log('Is Processed:', doc.is_processed);
      console.log('AI Context Enabled:', doc.is_ai_context_enabled);
      console.log('Processing Error:', doc.processing_error);
      console.log('Created:', doc.created_at);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDocuments();
