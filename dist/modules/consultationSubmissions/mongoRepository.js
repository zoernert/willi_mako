"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationSubmissionsRepository = void 0;
const mongodb_1 = require("mongodb");
const mongodb_2 = __importDefault(require("../../config/mongodb"));
const COLLECTION = 'consultation_submissions';
class ConsultationSubmissionsRepository {
    constructor() {
        this.db = null;
        this.collection = null;
        this.toPublicDTO = (doc) => {
            var _a;
            return ({
                id: String(doc._id || ''),
                slug: doc.slug,
                chapterKey: doc.chapterKey,
                author: doc.author,
                organization: doc.organization,
                comment: doc.comment,
                createdAt: doc.createdAt,
                curatedSummary: doc.curatedSummary,
                curatedOpinion: (_a = doc.curatedOpinion) !== null && _a !== void 0 ? _a : null,
            });
        };
    }
    async ensure() {
        if (!this.db) {
            this.db = await mongodb_2.default.getInstance().connect();
        }
        if (!this.collection) {
            this.collection = this.db.collection(COLLECTION);
            // Minimal indexes
            await this.collection.createIndex({ slug: 1, chapterKey: 1, createdAt: -1 });
            await this.collection.createIndex({ published: 1 });
            await this.collection.createIndex({ status: 1 });
            await this.collection.createIndex({ slug: 1, published: 1, status: 1 });
        }
    }
    async create(input) {
        var _a, _b, _c;
        await this.ensure();
        const now = new Date().toISOString();
        const doc = {
            slug: input.slug,
            chapterKey: input.chapterKey,
            author: input.author,
            organization: input.organization,
            contact: input.contact,
            comment: input.comment,
            curatedOpinion: (_a = input.curatedOpinion) !== null && _a !== void 0 ? _a : null,
            curatedSummary: input.curatedSummary,
            createdAt: now,
            updatedAt: now,
            status: (_b = input.status) !== null && _b !== void 0 ? _b : 'pending',
            published: (_c = input.published) !== null && _c !== void 0 ? _c : false,
        };
        const result = await this.collection.insertOne(doc);
        return { ...doc, _id: result.insertedId };
    }
    async getPublicBySlug(slug, limit = 50) {
        await this.ensure();
        const cursor = this.collection.find({ slug, published: true }).sort({ createdAt: -1 }).limit(Math.min(200, Math.max(1, limit)));
        const docs = await cursor.toArray();
        return docs.map(this.toPublicDTO);
    }
    async getPublicBySlugAndChapter(slug, chapterKey, limit = 50) {
        await this.ensure();
        const cursor = this.collection.find({ slug, chapterKey, published: true }).sort({ createdAt: -1 }).limit(Math.min(200, Math.max(1, limit)));
        const docs = await cursor.toArray();
        return docs.map(this.toPublicDTO);
    }
    async getPublicById(id) {
        await this.ensure();
        if (!mongodb_1.ObjectId.isValid(id))
            return null;
        const doc = await this.collection.findOne({ _id: new mongodb_1.ObjectId(id), published: true });
        return doc ? this.toPublicDTO(doc) : null;
    }
    // Admin: list all (including unpublished) with filters
    async listAll(slug, options) {
        var _a, _b;
        await this.ensure();
        const query = { slug };
        if (typeof (options === null || options === void 0 ? void 0 : options.published) === 'boolean')
            query.published = options.published;
        if ((options === null || options === void 0 ? void 0 : options.status) && options.status !== 'all')
            query.status = options.status;
        if (options === null || options === void 0 ? void 0 : options.chapterKey)
            query.chapterKey = options.chapterKey;
        if (options === null || options === void 0 ? void 0 : options.q) {
            const rx = new RegExp(options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { comment: rx },
                { author: rx },
                { organization: rx },
            ];
        }
        const limit = Math.min(200, Math.max(1, (_a = options === null || options === void 0 ? void 0 : options.limit) !== null && _a !== void 0 ? _a : 50));
        const offset = Math.max(0, (_b = options === null || options === void 0 ? void 0 : options.offset) !== null && _b !== void 0 ? _b : 0);
        const cursor = this.collection.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit);
        return cursor.toArray();
    }
    async getById(id) {
        await this.ensure();
        if (!mongodb_1.ObjectId.isValid(id))
            return null;
        return this.collection.findOne({ _id: new mongodb_1.ObjectId(id) });
    }
    async updateById(id, patch) {
        await this.ensure();
        if (!mongodb_1.ObjectId.isValid(id))
            return null;
        const $set = { updatedAt: new Date().toISOString() };
        if (typeof patch.status !== 'undefined')
            $set.status = patch.status;
        if (typeof patch.published !== 'undefined')
            $set.published = patch.published;
        if (typeof patch.curatedSummary !== 'undefined')
            $set.curatedSummary = patch.curatedSummary;
        if (typeof patch.curatedOpinion !== 'undefined')
            $set.curatedOpinion = patch.curatedOpinion;
        await this.collection.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set });
        return this.collection.findOne({ _id: new mongodb_1.ObjectId(id) });
    }
    async deleteById(id) {
        await this.ensure();
        if (!mongodb_1.ObjectId.isValid(id))
            return false;
        const res = await this.collection.deleteOne({ _id: new mongodb_1.ObjectId(id) });
        return (res.deletedCount || 0) > 0;
    }
}
exports.ConsultationSubmissionsRepository = ConsultationSubmissionsRepository;
//# sourceMappingURL=mongoRepository.js.map