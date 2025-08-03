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
    static getSetting(key: string, defaultValue?: any): Promise<any>;
    static getSettings(keys: string[]): Promise<Record<string, any>>;
    static getSettingsByCategory(category: string): Promise<Record<string, any>>;
    static setSetting(key: string, value: any, updatedBy?: string): Promise<void>;
    static setSettings(settings: Record<string, any>, updatedBy?: string): Promise<void>;
    static getSMTPSettings(): Promise<SMTPSettings>;
    static clearCache(): void;
    private static parseSettingValue;
    private static isCacheValid;
}
//# sourceMappingURL=systemSettingsService.d.ts.map