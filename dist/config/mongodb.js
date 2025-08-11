"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
class MongoDBConnection {
    constructor() {
        this.client = null;
        this.db = null;
    }
    static getInstance() {
        if (!MongoDBConnection.instance) {
            MongoDBConnection.instance = new MongoDBConnection();
        }
        return MongoDBConnection.instance;
    }
    async connect() {
        if (this.db) {
            return this.db;
        }
        try {
            const mongoUri = process.env.MONGO_URI;
            if (!mongoUri) {
                throw new Error('MONGO_URI environment variable is not set');
            }
            console.log('Connecting to MongoDB...');
            this.client = new mongodb_1.MongoClient(mongoUri);
            await this.client.connect();
            // Extract database name from URI or use default
            const dbName = 'quitus'; // Based on the URI in .env
            this.db = this.client.db(dbName);
            console.log('Connected to MongoDB successfully');
            return this.db;
        }
        catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('Disconnected from MongoDB');
        }
    }
    getDb() {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }
}
exports.default = MongoDBConnection;
//# sourceMappingURL=mongodb.js.map