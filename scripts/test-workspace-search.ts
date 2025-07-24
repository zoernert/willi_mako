#!/usr/bin/env ts-node

import { WorkspaceService } from '../src/services/workspaceService';
import { QdrantService } from '../src/services/qdrant';
import pool from '../src/config/database';

async function testWorkspaceSearch() {
  console.log('🔍 Testing workspace search functionality...');
  
  const workspaceService = new WorkspaceService();
  const qdrantService = new QdrantService();
  
  try {
    // Get a user ID from the database
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`👤 Testing with user ID: ${userId}`);
    
    // Check documents in database
    const docResult = await pool.query(`
      SELECT id, title, is_processed, processing_error, created_at 
      FROM user_documents 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId]);
    
    console.log(`\n📚 User documents in database: ${docResult.rows.length}`);
    docResult.rows.forEach(doc => {
      console.log(`   - ${doc.title} (processed: ${doc.is_processed}, error: ${doc.processing_error || 'none'})`);
    });
    
    // Test Qdrant collection info
    try {
      const collections = await qdrantService.client.getCollections();
      console.log(`\n🏗️  Qdrant collections:`, collections.collections.map(c => ({ name: c.name, vectors_count: c.vectors_count })));
      
      // Get collection info
      const collectionInfo = await qdrantService.client.getCollection('workspace_documents');
      console.log(`📊 workspace_documents collection info:`, {
        vectors_count: collectionInfo.vectors_count,
        points_count: collectionInfo.points_count,
        status: collectionInfo.status
      });
    } catch (error) {
      console.error('❌ Error accessing Qdrant:', error);
    }
    
    // Test workspace search
    console.log(`\n🔍 Testing workspace search...`);
    try {
      const searchResults = await workspaceService.searchWorkspace(userId, {
        query: 'PDF',
        includeDocuments: true,
        includeNotes: false,
        limit: 5
      });
      
      console.log(`📋 Search results:`, {
        total: searchResults.total,
        documents: searchResults.documents?.length || 0,
        notes: searchResults.notes?.length || 0
      });
      
      if (searchResults.documents && searchResults.documents.length > 0) {
        console.log(`   Documents found:`);
        searchResults.documents.forEach(doc => {
          console.log(`   - ${doc.title} (score: ${doc.relevance_score || 'N/A'})`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error during workspace search:', error);
    }
    
    // Test direct Qdrant search
    console.log(`\n🎯 Testing direct Qdrant search...`);
    try {
      const directResults = await qdrantService.searchByText('PDF', userId, 5);
      console.log(`   Direct Qdrant results: ${directResults.length}`);
      directResults.forEach(result => {
        console.log(`   - ${result.payload.title || 'Untitled'} (score: ${result.score})`);
      });
    } catch (error) {
      console.error('❌ Error during direct Qdrant search:', error);
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await pool.end();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testWorkspaceSearch().catch(console.error);
}

export { testWorkspaceSearch };
