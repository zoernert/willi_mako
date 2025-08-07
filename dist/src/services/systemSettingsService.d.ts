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
export declare class SystemSettingsService {
    private static cache;
    private static lastCacheUpdate;
    private static CACHE_TTL;
    /**
     * Get a setting value by key
     */
    static getSetting(key: string, defaultValue?: any): Promise<any>;
    /**
     * Get multiple settings by keys
     */
    static getSettings(keys: string[]): Promise<Record<string, any>>;
    /**
     * Get all settings by category
     */
    static getSettingsByCategory(category: string): Promise<Record<string, any>>;
    /**
     * Set a setting value
     */
    static setSetting(key: string, value: any, updatedBy?: string): Promise<void>;
    /**
     * Set multiple settings
     */
    static setSettings(settings: Record<string, any>, updatedBy?: string): Promise<void>;
    /**
     * Get SMTP settings specifically
     */
    static getSMTPSettings(): Promise<SMTPSettings>;
    /**
     * Clear settings cache
     */
    static clearCache(): void;
    /**
     * Parse setting value based on type
     */
    private static parseSettingValue;
    /**
     * Check if cache is still valid
     */
    private static isCacheValid;
}
//# sourceMappingURL=systemSettingsService.d.ts.map