import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let testDb: Pool;

export async function setupTestDatabase(): Promise<void> {
  testDb = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'willi_mako_test',
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  // Wait for connection
  await testDb.query('SELECT 1');

  // Run migrations
  await runMigrations(testDb);
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testDb) {
    await clearAllTables();
    await testDb.end();
  }
}

export function getTestDbConnection(): Pool {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

export async function clearAllTables(): Promise<void> {
  if (!testDb) return;

  const tables = [
    'quiz_attempts',
    'quiz_questions', 
    'quizzes',
    'workspace_notes',
    'workspaces',
    'user_profiles',
    'users',
    'system_logs'
  ];

  // Disable foreign key checks temporarily
  await testDb.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of tables) {
    try {
      await testDb.query(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist, continue
      console.warn(`Warning: Could not clear table ${table}:`, error);
    }
  }

  // Re-enable foreign key checks
  await testDb.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function runMigrations(db: Pool): Promise<void> {
  const migrationFiles = [
    'workspace_schema.sql',
    'quiz_gamification_schema.sql',
    'enhanced_logging_system.sql'
  ];

  for (const file of migrationFiles) {
    const migrationPath = path.join(__dirname, '../../migrations', file);
    
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await db.query(migration);
        console.log(`Migration ${file} executed successfully`);
      } catch (error) {
        console.warn(`Warning: Migration ${file} failed:`, error);
        // Continue with other migrations
      }
    } else {
      console.warn(`Migration file not found: ${migrationPath}`);
    }
  }
}

export async function createTestUser(
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }
): Promise<any> {
  const db = getTestDbConnection();
  
  const result = await db.query(`
    INSERT INTO users (email, password_hash, first_name, last_name)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, first_name, last_name, created_at, updated_at
  `, [userData.email, userData.password, userData.firstName, userData.lastName]);

  return result.rows[0];
}

export async function createTestWorkspace(
  userId: string,
  workspaceData: {
    name: string;
    description?: string;
  }
): Promise<any> {
  const db = getTestDbConnection();
  
  const result = await db.query(`
    INSERT INTO workspaces (user_id, name, description, settings)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, name, description, settings, created_at, updated_at
  `, [userId, workspaceData.name, workspaceData.description || '', '{}']);

  return result.rows[0];
}

export async function createTestQuiz(
  authorId: string,
  quizData: {
    title: string;
    description?: string;
    difficulty?: string;
  }
): Promise<any> {
  const db = getTestDbConnection();
  
  const result = await db.query(`
    INSERT INTO quizzes (author_id, title, description, difficulty, questions)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, author_id, title, description, difficulty, questions, created_at, updated_at
  `, [
    authorId, 
    quizData.title, 
    quizData.description || '', 
    quizData.difficulty || 'medium',
    JSON.stringify([])
  ]);

  return result.rows[0];
}
