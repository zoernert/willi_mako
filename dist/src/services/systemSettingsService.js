"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSettingsService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../core/logging/logger");
// Lazy logger initialization to avoid startup issues
let logger = null;
const getLoggerSafe = () => {
    if (!logger) {
        try {
            logger = (0, logger_1.getLogger)();
        }
        catch (_a) {
            // Fallback to console if logger not initialized
            logger = console;
        }
    }
    return logger;
};
class SystemSettingsService {
    /**
     * Get a setting value by key
     */
    static async getSetting(key, defaultValue) {
        try {
            // Check cache first
            if (this.isCacheValid() && this.cache.has(key)) {
                return this.cache.get(key);
            }
            const result = await database_1.default.query('SELECT * FROM system_settings WHERE key = $1', [key]);
            if (result.rows.length === 0) {
                return defaultValue;
            }
            const setting = result.rows[0];
            const value = this.parseSettingValue(setting);
            // Cache the result
            this.cache.set(key, value);
            return value;
        }
        catch (error) {
            getLoggerSafe().error(`Error getting setting ${key}:`, error instanceof Error ? error.message : String(error));
            return defaultValue;
        }
    }
    /**
     * Get multiple settings by keys
     */
    static async getSettings(keys) {
        try {
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
            const result = await database_1.default.query(`SELECT * FROM system_settings WHERE key IN (${placeholders})`, keys);
            const settings = {};
            result.rows.forEach((row) => {
                settings[row.key] = this.parseSettingValue(row);
                this.cache.set(row.key, settings[row.key]);
            });
            return settings;
        }
        catch (error) {
            getLoggerSafe().error('Error getting multiple settings:', error instanceof Error ? error.message : String(error));
            return {};
        }
    }
    /**
     * Get all settings by category
     */
    static async getSettingsByCategory(category) {
        try {
            const result = await database_1.default.query('SELECT * FROM system_settings WHERE category = $1 ORDER BY key', [category]);
            const settings = {};
            result.rows.forEach((row) => {
                const key = row.key.replace(`${category}.`, ''); // Remove category prefix
                settings[key] = this.parseSettingValue(row);
                this.cache.set(row.key, settings[key]);
            });
            return settings;
        }
        catch (error) {
            getLoggerSafe().error(`Error getting settings for category ${category}:`, error instanceof Error ? error.message : String(error));
            return {};
        }
    }
    /**
     * Set a setting value
     */
    static async setSetting(key, value, updatedBy) {
        try {
            // Determine value type
            let valueType = 'string';
            let stringValue = String(value);
            if (typeof value === 'number') {
                valueType = 'number';
            }
            else if (typeof value === 'boolean') {
                valueType = 'boolean';
            }
            else if (typeof value === 'object') {
                valueType = 'json';
                stringValue = JSON.stringify(value);
            }
            await database_1.default.query(`
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
        }
        catch (error) {
            getLoggerSafe().error(`Error setting ${key}:`, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    /**
     * Set multiple settings
     */
    static async setSettings(settings, updatedBy) {
        try {
            await database_1.default.query('BEGIN');
            for (const [key, value] of Object.entries(settings)) {
                await this.setSetting(key, value, updatedBy);
            }
            await database_1.default.query('COMMIT');
            getLoggerSafe().info(`Multiple settings updated by ${updatedBy || 'system'}`);
        }
        catch (error) {
            getLoggerSafe().error('Error setting multiple settings:', error instanceof Error ? error.message : String(error));
            await database_1.default.query('ROLLBACK');
            throw error;
        }
    }
    /**
     * Get SMTP settings specifically
     */
    static async getSMTPSettings() {
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
    static clearCache() {
        this.cache.clear();
        this.lastCacheUpdate = 0;
    }
    /**
     * Parse setting value based on type
     */
    static parseSettingValue(setting) {
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
                }
                catch (_a) {
                    return setting.value;
                }
            default:
                return setting.value;
        }
    }
    /**
     * Check if cache is still valid
     */
    static isCacheValid() {
        return Date.now() - this.lastCacheUpdate < this.CACHE_TTL;
    }
}
exports.SystemSettingsService = SystemSettingsService;
SystemSettingsService.cache = new Map();
SystemSettingsService.lastCacheUpdate = 0;
SystemSettingsService.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
//# sourceMappingURL=systemSettingsService.js.map