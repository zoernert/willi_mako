"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoSessionRepository = void 0;
const mongodb_1 = __importDefault(require("../../../config/mongodb"));
class MongoSessionRepository {
    constructor(collectionName = 'api_v2_sessions') {
        this.collectionName = collectionName;
        this.collection = null;
        this.indexesEnsured = false;
    }
    async getCollection() {
        if (this.collection) {
            return this.collection;
        }
        const connection = mongodb_1.default.getInstance();
        const db = await connection.connect();
        this.collection = db.collection(this.collectionName);
        if (!this.indexesEnsured) {
            await this.ensureIndexes();
        }
        return this.collection;
    }
    async ensureIndexes() {
        if (!this.collection) {
            return;
        }
        await Promise.all([
            this.collection.createIndex({ sessionId: 1 }, { unique: true }),
            this.collection.createIndex({ userId: 1, sessionId: 1 }),
            this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        ]);
        this.indexesEnsured = true;
    }
    async save(session) {
        const collection = await this.getCollection();
        await collection.updateOne({ sessionId: session.sessionId }, { $set: session }, { upsert: true });
        return session;
    }
    async findById(sessionId) {
        const collection = await this.getCollection();
        return collection.findOne({ sessionId });
    }
    async delete(sessionId) {
        const collection = await this.getCollection();
        await collection.deleteOne({ sessionId });
    }
}
exports.MongoSessionRepository = MongoSessionRepository;
//# sourceMappingURL=session.repository.js.map