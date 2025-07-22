import { Pool, Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'willi_mako',
  user: process.env.DB_USER || 'willi_user',
  password: process.env.DB_PASSWORD || 'willi_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;

// Database initialization
export const initDatabase = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'willi_user',
    password: process.env.DB_PASSWORD || 'willi_password',
  });

  try {
    await client.connect();
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'willi_mako';
    await client.query(`CREATE DATABASE ${dbName}`).catch(() => {
      console.log(`Database ${dbName} already exists`);
    });
    
    await client.end();
    
    // Now connect to the actual database and create tables
    const dbClient = await pool.connect();
    
    // Create users table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        full_name VARCHAR(255),
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create chats table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create messages table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create documents table for PDFs
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_preferences table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        companies_of_interest JSONB DEFAULT '[]',
        preferred_topics JSONB DEFAULT '[]',
        notification_settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create FAQ table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        context TEXT NOT NULL,
        answer TEXT NOT NULL,
        additional_info TEXT,
        tags JSONB DEFAULT '[]',
        source_chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
        source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Drop old category tables if they exist
    await dbClient.query(`DROP TABLE IF EXISTS faq_category_relations CASCADE`);
    await dbClient.query(`DROP TABLE IF EXISTS faq_categories CASCADE`);
    
    // Create admin user if not exists
    const adminEmail = 'admin@willi-mako.com';
    const adminPassword = 'admin123'; // Change this in production
    const bcryptjs = require('bcryptjs');
    const hashedPassword = await bcryptjs.hash(adminPassword, 12);
    
    await dbClient.query(`
      INSERT INTO users (email, password_hash, role, full_name)
      VALUES ($1, $2, 'admin', 'System Administrator')
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, hashedPassword]);
    
    dbClient.release();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};
