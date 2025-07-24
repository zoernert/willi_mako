#!/usr/bin/env node

// Test Qdrant connection and collection info
require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

async function testQdrant() {
  const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false
  });

  try {
    console.log('🔗 Connecting to Qdrant...');
    console.log('URL:', process.env.QDRANT_URL);
    console.log('Collection:', process.env.QDRANT_COLLECTION);
    
    // Get collections
    const collections = await client.getCollections();
    console.log('\n📚 Available collections:', collections.collections.map(c => c.name));
    
    // Check if our collection exists
    const collectionName = process.env.QDRANT_COLLECTION || 'willi';
    const collectionExists = collections.collections.some(c => c.name === collectionName);
    
    if (collectionExists) {
      console.log(`✅ Collection "${collectionName}" exists`);
      
      // Get collection info
      const info = await client.getCollection(collectionName);
      console.log('\n📊 Collection Info:');
      console.log('- Points count:', info.points_count);
      console.log('- Vector size:', info.config?.params?.vectors?.size || 'Unknown');
      console.log('- Distance metric:', info.config?.params?.vectors?.distance || 'Unknown');
      
      // Get some sample points
      const points = await client.scroll(collectionName, {
        limit: 3,
        with_payload: true,
        with_vector: false
      });
      
      console.log('\n🔍 Sample points:');
      points.points.forEach((point, i) => {
        console.log(`${i + 1}. ID: ${point.id}`);
        if (point.payload?.title) {
          console.log(`   Title: ${point.payload.title}`);
        }
        if (point.payload?.user_id) {
          console.log(`   User ID: ${point.payload.user_id}`);
        }
        if (point.payload?.text_content_sample) {
          console.log(`   Content: ${point.payload.text_content_sample.substring(0, 100)}...`);
        }
        console.log('');
      });
      
    } else {
      console.log(`❌ Collection "${collectionName}" does not exist`);
      console.log('Creating collection...');
      
      await client.createCollection(collectionName, {
        vectors: { size: 768, distance: 'Cosine' }
      });
      
      console.log(`✅ Collection "${collectionName}" created`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testQdrant();
