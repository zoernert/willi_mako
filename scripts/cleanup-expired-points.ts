#!/usr/bin/env node

/**
 * Cleanup Expired Points Script
 * 
 * This script should be run daily via cron job to remove expired points
 * from the user_points table to maintain data integrity and performance.
 * 
 * Usage:
 *   node scripts/cleanup-expired-points.js
 * 
 * Cron setup (daily at 2 AM):
 *   0 2 * * * /usr/bin/node /path/to/willi_mako/scripts/cleanup-expired-points.js >> /var/log/points-cleanup.log 2>&1
 */

import { GamificationService } from '../src/modules/quiz/gamification.service';
import pool from '../src/config/database';

async function cleanupExpiredPoints() {
  console.log(`[${new Date().toISOString()}] Starting expired points cleanup...`);
  
  try {
    const gamificationService = new GamificationService();
    const deletedCount = await gamificationService.cleanupExpiredPoints();
    
    console.log(`[${new Date().toISOString()}] Successfully cleaned up ${deletedCount} expired points`);
    
    if (deletedCount > 0) {
      console.log(`[${new Date().toISOString()}] Database maintenance: Freed up storage space by removing ${deletedCount} expired records`);
    } else {
      console.log(`[${new Date().toISOString()}] No expired points found - database is clean`);
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during points cleanup:`, error);
    throw error;
  }
}

async function main() {
  try {
    await cleanupExpiredPoints();
    
    // Close database connections
    await pool.end();
    
    console.log(`[${new Date().toISOString()}] Points cleanup completed successfully`);
    process.exit(0);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Points cleanup failed:`, error);
    
    // Close database connections
    try {
      await pool.end();
    } catch (poolError) {
      console.error('Error closing database pool:', poolError);
    }
    
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

export { cleanupExpiredPoints };
