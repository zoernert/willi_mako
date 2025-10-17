import { Db } from 'mongodb';
declare class MongoDBConnection {
    private client;
    private db;
    private static instance;
    private connectingPromise;
    private constructor();
    static getInstance(): MongoDBConnection;
    connect(): Promise<Db>;
    disconnect(): Promise<void>;
    getDb(): Db;
    private establishConnection;
    private safeCloseClient;
    private delay;
    private resolveDatabaseName;
    private parsePositiveInt;
}
export default MongoDBConnection;
//# sourceMappingURL=mongodb.d.ts.map