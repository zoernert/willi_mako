import pool from '../config/database';

/**
 * Database Query Helper - Eliminiert das repetitive Pool-Connection Pattern
 */
export class DatabaseHelper {
  /**
   * Führt eine Query aus mit automatischem Connection-Management
   */
  static async executeQuery<T>(
    sql: string, 
    params: any[] = []
  ): Promise<T[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Führt eine Query aus und gibt das erste Ergebnis zurück
   */
  static async executeQuerySingle<T>(
    sql: string, 
    params: any[] = []
  ): Promise<T | null> {
    const results = await this.executeQuery<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Führt eine Transaction aus
   */
  static async executeTransaction<T>(
    operations: ((client: any) => Promise<T>)[]
  ): Promise<T[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Prüft ob ein Datensatz existiert
   */
  static async exists(
    table: string, 
    condition: string, 
    params: any[]
  ): Promise<boolean> {
    const sql = `SELECT 1 FROM ${table} WHERE ${condition} LIMIT 1`;
    const result = await this.executeQuery(sql, params);
    return result.length > 0;
  }

  /**
   * Zählt Datensätze in einer Tabelle
   */
  static async count(
    table: string, 
    condition?: string, 
    params: any[] = []
  ): Promise<number> {
    const sql = condition 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    
    const result = await this.executeQuerySingle<{count: string}>(sql, params);
    return result ? parseInt(result.count, 10) : 0;
  }
}
