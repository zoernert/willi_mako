#!/usr/bin/env ts-node

import pool from '../src/config/database';
import { DocumentService } from '../src/services/documentService';

async function reindexDocuments() {
  console.log('🔄 Starting document reindexing...');
  
  const documentService = new DocumentService();
  
  try {
    // Get all processed documents that need reindexing
    const result = await pool.query(`
      SELECT id, user_id, title, file_path, mime_type 
      FROM user_documents 
      WHERE is_processed = true 
      AND file_path IS NOT NULL 
      ORDER BY created_at DESC
    `);
    
    console.log(`📚 Found ${result.rows.length} documents to reindex`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of result.rows) {
      try {
        console.log(`🔍 Processing: ${doc.title} (${doc.id})`);
        
        // Reset processing status
        await pool.query(
          'UPDATE user_documents SET is_processed = false, processing_error = null WHERE id = $1',
          [doc.id]
        );
        
        // Reprocess and index the document
        await documentService.processAndIndexDocument(doc.id, doc.user_id);
        
        successCount++;
        console.log(`✅ Successfully reindexed: ${doc.title}`);
        
        // Add a small delay to avoid overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to reindex ${doc.title}:`, error);
      }
    }
    
    console.log(`\n📊 Reindexing complete:`);
    console.log(`   ✅ Success: ${successCount} documents`);
    console.log(`   ❌ Errors: ${errorCount} documents`);
    
  } catch (error) {
    console.error('❌ Error during reindexing:', error);
  } finally {
    await pool.end();
  }
}

// Run the reindexing if this script is executed directly
if (require.main === module) {
  reindexDocuments().catch(console.error);
}

export { reindexDocuments };
