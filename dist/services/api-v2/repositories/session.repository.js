"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoSessionRepository = void 0;
const mongodb_1 = __importDefault(require("../../../config/mongodb"));
const errorHandler_1 = require("../../../middleware/errorHandler");
class MongoSessionRepository {
    constructor(collectionName = 'api_v2_sessions') {
        this.collectionName = collectionName;
        this.collection = null;
        this.indexesEnsured = false;
        this.collectionPromise = null;
        this.indexPromise = null;
    }
    async getCollection() {
        if (this.collection) {
            return this.collection;
        }
        const connection = mongodb_1.default.getInstance();
        if (this.collectionPromise) {
            return this.collectionPromise;
        }
        const promise = (async () => {
            try {
                const db = await connection.connect();
                const collection = db.collection(this.collectionName);
                this.collection = collection;
                this.ensureIndexesInBackground(collection);
                return collection;
            }
            catch (error) {
                console.error('SessionRepository: failed to obtain collection:', error);
                const appError = new errorHandler_1.AppError('MongoDB ist aktuell nicht erreichbar. Bitte versuchen Sie es in Kürze erneut.', 503);
                appError.context = {
                    code: 'mongo_unavailable',
                    error: error instanceof Error ? error.message : String(error || 'unknown')
                };
                throw appError;
            }
        })();
        this.collectionPromise = promise.finally(() => {
            this.collectionPromise = null;
        });
        return promise;
    }
    ensureIndexesInBackground(collection) {
        if (this.indexesEnsured || this.indexPromise) {
            return;
        }
        this.indexPromise = (async () => {
            try {
                const results = await Promise.allSettled([
                    collection.createIndex({ sessionId: 1 }, { unique: true }),
                    collection.createIndex({ userId: 1, sessionId: 1 }),
                    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
                ]);
                const rejected = results.filter((result) => result.status === 'rejected');
                if (rejected.length) {
                    console.warn('SessionRepository: index creation failed – continuing without indexes for now.', rejected.map((r) => (r.status === 'rejected' && r.reason) || 'unknown'));
                    this.indexesEnsured = false;
                }
                else {
                    this.indexesEnsured = true;
                }
            }
            catch (error) {
                console.error('SessionRepository: unexpected error while creating indexes:', error);
                this.indexesEnsured = false;
            }
            finally {
                this.indexPromise = null;
            }
        })();
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