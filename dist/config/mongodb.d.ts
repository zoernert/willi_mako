import { Db } from 'mongodb';
declare class MongoDBConnection {
    private client;
    private db;
    private static instance;
    private constructor();
    static getInstance(): MongoDBConnection;
    connect(): Promise<Db>;
    disconnect(): Promise<void>;
    getDb(): Db;
}
export default MongoDBConnection;
//# sourceMappingURL=mongodb.d.ts.map