import pool from '../config/database';
import { getLogger } from '../core/logging/logger';

// Lazy logger initialization to avoid startup issues
let logger: any = null;
const getLoggerSafe = () => {
  if (!logger) {
    try {
      logger = getLogger();
    } catch {
      // Fallback to console if logger not initialized
      logger = console;
    }
  }
  return logger;
};

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export class SystemSettingsService {
  private static cache = new Map<string, any>();
  private static lastCacheUpdate = 0;
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get a setting value by key
   */
  static async getSetting(key: string, defaultValue?: any): Promise<any> {
    try {
      // Check cache first
      if (this.isCacheValid() && this.cache.has(key)) {
        return this.cache.get(key);
      }

      const result = await pool.query(
        'SELECT * FROM system_settings WHERE key = $1',
        [key]
      );

      if (result.rows.length === 0) {
        return defaultValue;
      }

      const setting = result.rows[0] as SystemSetting;
      const value = this.parseSettingValue(setting);
      
      // Cache the result
      this.cache.set(key, value);
      
      return value;
    } catch (error) {
      getLoggerSafe().error(`Error getting setting ${key}:`, error instanceof Error ? error.message : String(error));
      return defaultValue;
    }
  }

  /**
   * Get multiple settings by keys
   */
  static async getSettings(keys: string[]): Promise<Record<string, any>> {
    try {
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
      const result = await pool.query(
        `SELECT * FROM system_settings WHERE key IN (${placeholders})`,
        keys
      );

      const settings: Record<string, any> = {};
      result.rows.forEach((row: SystemSetting) => {
        settings[row.key] = this.parseSettingValue(row);
        this.cache.set(row.key, settings[row.key]);
      });

      return settings;
    } catch (error) {
      getLoggerSafe().error('Error getting multiple settings:', error instanceof Error ? error.message : String(error));
      return {};
    }
  }

  /**
   * Get all settings by category
   */
  static async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    try {
      const result = await pool.query(
        'SELECT * FROM system_settings WHERE category = $1 ORDER BY key',
        [category]
      );

      const settings: Record<string, any> = {};
      result.rows.forEach((row: SystemSetting) => {
        const key = row.key.replace(`${category}.`, ''); // Remove category prefix
        settings[key] = this.parseSettingValue(row);
        this.cache.set(row.key, settings[key]);
      });

      return settings;
    } catch (error) {
      getLoggerSafe().error(`Error getting settings for category ${category}:`, error instanceof Error ? error.message : String(error));
      return {};
    }
  }

  /**
   * Set a setting value
   */
  static async setSetting(key: string, value: any, updatedBy?: string): Promise<void> {
    try {
      // Determine value type
      let valueType: SystemSetting['value_type'] = 'string';
      let stringValue = String(value);
      
      if (typeof value === 'number') {
        valueType = 'number';
      } else if (typeof value === 'boolean') {
        valueType = 'boolean';
      } else if (typeof value === 'object') {
        valueType = 'json';
        stringValue = JSON.stringify(value);
      }

      await pool.query(`
        INSERT INTO system_settings (key, value, value_type, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          value_type = EXCLUDED.value_type,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, [key, stringValue, valueType, updatedBy]);

      // Update cache
      this.cache.set(key, value);
      
      getLoggerSafe().info(`Setting ${key} updated by ${updatedBy || 'system'}`);
    } catch (error) {
      getLoggerSafe().error(`Error setting ${key}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Set multiple settings
   */
  static async setSettings(settings: Record<string, any>, updatedBy?: string): Promise<void> {
    try {
      await pool.query('BEGIN');
      
      for (const [key, value] of Object.entries(settings)) {
        await this.setSetting(key, value, updatedBy);
      }
      
      await pool.query('COMMIT');
      
      getLoggerSafe().info(`Multiple settings updated by ${updatedBy || 'system'}`);
    } catch (error) {
      getLoggerSafe().error('Error setting multiple settings:', error instanceof Error ? error.message : String(error));
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get SMTP settings specifically
   */
  static async getSMTPSettings(): Promise<SMTPSettings> {
    const smtpKeys = [
      'smtp.host',
      'smtp.port', 
      'smtp.secure',
      'smtp.user',
      'smtp.password',
      'smtp.from_email',
      'smtp.from_name',
      'email.notifications_enabled'
    ];

    const settings = await this.getSettings(smtpKeys);
    
    return {
      host: settings['smtp.host'] || process.env.SMTP_HOST || '',
      port: settings['smtp.port'] || parseInt(process.env.SMTP_PORT || '587'),
      secure: settings['smtp.secure'] || process.env.SMTP_SECURE === 'true',
      user: settings['smtp.user'] || process.env.SMTP_USER || '',
      password: settings['smtp.password'] || process.env.SMTP_PASS || '',
      fromEmail: settings['smtp.from_email'] || process.env.FROM_EMAIL || 'noreply@willi-mako.com',
      fromName: settings['smtp.from_name'] || 'Willi Mako',
      enabled: settings['email.notifications_enabled'] !== false
    };
  }

  /**
   * Clear settings cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Parse setting value based on type
   */
  private static parseSettingValue(setting: SystemSetting): any {
    if (setting.value === null) {
      return null;
    }

    switch (setting.value_type) {
      case 'number':
        return parseFloat(setting.value);
      case 'boolean':
        return setting.value.toLowerCase() === 'true';
      case 'json':
        try {
          return JSON.parse(setting.value);
        } catch {
          return setting.value;
        }
      default:
        return setting.value;
    }
  }

  /**
   * Check if cache is still valid
   */
  private static isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_TTL;
  }
}
