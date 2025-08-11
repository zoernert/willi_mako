/**
 * Database Query Helper - Eliminiert das repetitive Pool-Connection Pattern
 */
export declare class DatabaseHelper {
    /**
     * Führt eine Query aus mit automatischem Connection-Management
     */
    static executeQuery<T>(sql: string, params?: any[]): Promise<T[]>;
    /**
     * Führt eine Query aus und gibt das erste Ergebnis zurück
     */
    static executeQuerySingle<T>(sql: string, params?: any[]): Promise<T | null>;
    /**
     * Führt eine Transaction aus
     */
    static executeTransaction<T>(operations: ((client: any) => Promise<T>)[]): Promise<T[]>;
    /**
     * Prüft ob ein Datensatz existiert
     */
    static exists(table: string, condition: string, params: any[]): Promise<boolean>;
    /**
     * Zählt Datensätze in einer Tabelle
     */
    static count(table: string, condition?: string, params?: any[]): Promise<number>;
}
//# sourceMappingURL=database.d.ts.map