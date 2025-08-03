#!/usr/bin/env node

/**
 * Migration script to add existing FAQs to the Vector Store
 */

const { Pool } = require('pg');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Qdrant configuration
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'ewilli';

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Initialize Qdrant client
const qdrantClient = new QdrantClient({ 
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false
});

/**
 * Generate embedding using Gemini
 */
async function generateEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Store FAQ in vector database
 */
async function storeFAQInVector(faq) {
  try {
    // Combine all FAQ content for embedding
    const fullContent = [
      faq.title,
      faq.description,
      faq.context,
      faq.answer,
      faq.additional_info
    ].filter(Boolean).join('\n\n').trim();
    
    const embedding = await generateEmbedding(fullContent);
    
    await qdrantClient.upsert(QDRANT_COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: `faq_${faq.id}`,
          vector: embedding,
          payload: {
            type: 'faq',
            faq_id: faq.id,
            title: faq.title,
            description: faq.description,
            context: faq.context,
            answer: faq.answer,
            additional_info: faq.additional_info,
            tags: faq.tags,
            text: fullContent,
            created_at: faq.created_at,
            is_active: faq.is_active,
            is_public: faq.is_public,
            view_count: faq.view_count,
          },
        },
      ],
    });
    
    console.log(`✅ FAQ "${faq.title}" stored in vector database`);
  } catch (error) {
    console.error(`❌ Error storing FAQ "${faq.title}":`, error.message);
  }
}

/**
 * Main migration function
 */
async function migrateFAQsToVectorStore() {
  console.log('🚀 Starting FAQ Vector Store Migration');
  console.log('=====================================');
  
  try {
    // Ensure Qdrant collection exists
    console.log('📊 Checking Qdrant collection...');
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      col => col.name === QDRANT_COLLECTION_NAME
    );
    
    if (!collectionExists) {
      console.log(`📁 Creating collection "${QDRANT_COLLECTION_NAME}"...`);
      await qdrantClient.createCollection(QDRANT_COLLECTION_NAME, {
        vectors: { size: 768, distance: 'Cosine' },
      });
    }
    
    // Get all active FAQs
    console.log('📚 Fetching FAQs from database...');
    const result = await pool.query(`
      SELECT id, title, description, context, answer, additional_info, tags, 
             is_active, is_public, view_count, created_at
      FROM faqs
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    const faqs = result.rows;
    console.log(`📖 Found ${faqs.length} active FAQs to migrate`);
    
    if (faqs.length === 0) {
      console.log('ℹ️ No FAQs found to migrate');
      return;
    }
    
    // Check if FAQs already exist in vector store
    console.log('🔍 Checking existing FAQs in vector store...');
    const existingFAQs = new Set();
    
    try {
      const scrollResult = await qdrantClient.scroll(QDRANT_COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: 'type',
              match: { value: 'faq' }
            }
          ]
        },
        limit: 1000,
        with_payload: true,
        with_vector: false
      });
      
      scrollResult.points.forEach(point => {
        if (point.payload.faq_id) {
          existingFAQs.add(point.payload.faq_id);
        }
      });
      
      console.log(`📋 Found ${existingFAQs.size} existing FAQs in vector store`);
    } catch (error) {
      console.log('⚠️ Could not check existing FAQs, proceeding with full migration');
    }
    
    // Migrate FAQs
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const faq of faqs) {
      if (existingFAQs.has(faq.id)) {
        console.log(`⏭️ FAQ "${faq.title}" already exists in vector store`);
        skippedCount++;
        continue;
      }
      
      await storeFAQInVector(faq);
      migratedCount++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Migrated: ${migratedCount} FAQs`);
    console.log(`⏭️ Skipped: ${skippedCount} FAQs (already exist)`);
    console.log(`📊 Total: ${faqs.length} FAQs processed`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  migrateFAQsToVectorStore()
    .then(() => {
      console.log('\n✨ FAQ Vector Store Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateFAQsToVectorStore };
