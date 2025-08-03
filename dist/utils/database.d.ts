export declare class DatabaseHelper {
    static executeQuery<T>(sql: string, params?: any[]): Promise<T[]>;
    static executeQuerySingle<T>(sql: string, params?: any[]): Promise<T | null>;
    static executeTransaction<T>(operations: ((client: any) => Promise<T>)[]): Promise<T[]>;
    static exists(table: string, condition: string, params: any[]): Promise<boolean>;
    static count(table: string, condition?: string, params?: any[]): Promise<number>;
}
//# sourceMappingURL=database.d.ts.map