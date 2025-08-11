"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const database_1 = __importDefault(require("../config/database"));
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const qdrant_1 = require("./qdrant");
const textExtractor_1 = require("../utils/textExtractor");
class DocumentService {
    constructor() {
        this.qdrantService = new qdrant_1.QdrantService();
    }
    async createDocument(userId, data) {
        const { file, title, description, tags, is_ai_context_enabled } = data;
        const documentId = (0, uuid_1.v4)();
        const newPath = path_1.default.join('uploads/user-documents', `${userId}-${documentId}-${file.originalname}`);
        await promises_1.default.rename(file.path, newPath);
        const query = `
      INSERT INTO user_documents 
        (id, user_id, title, description, original_name, file_path, mime_type, file_size, tags, is_ai_context_enabled, is_processed)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
      RETURNING *;
    `;
        const values = [
            documentId,
            userId,
            title,
            description,
            file.originalname,
            newPath,
            file.mimetype,
            file.size,
            tags || [],
            is_ai_context_enabled || false,
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    }
    async processAndIndexDocument(documentId, userId) {
        try {
            const doc = await this.getDocumentById(documentId, userId);
            if (!doc || !doc.mime_type || !doc.file_path) {
                console.error(`Document with ID ${documentId} not found or missing required fields.`);
                await this.updateDocument(documentId, userId, {
                    is_processed: false,
                    processing_error: 'Document not found or missing required fields'
                });
                return;
            }
            const extractor = (0, textExtractor_1.getTextExtractor)(doc.mime_type);
            const text = await extractor.extract(doc.file_path);
            // Check if text extraction was successful (not just an error message)
            if (text.startsWith('[Error extracting')) {
                console.error(`Text extraction failed for document ${documentId}: ${text}`);
                await this.updateDocument(documentId, userId, {
                    is_processed: false,
                    processing_error: 'Text extraction failed'
                });
                return;
            }
            // For simplicity, we'll index the entire document text as one vector.
            // In a real-world scenario, you would chunk the text into smaller pieces.
            await this.qdrantService.upsertDocument(doc, text);
            await this.updateDocument(documentId, userId, {
                is_processed: true,
                processing_error: null
            });
        }
        catch (error) {
            console.error(`Failed to process and index document ${documentId}:`, error);
            await this.updateDocument(documentId, userId, {
                is_processed: false,
                processing_error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getUserDocuments(userId, options) {
        const { page, limit, search, processed } = options;
        const offset = (page - 1) * limit;
        let query = `SELECT * FROM user_documents WHERE user_id = $1`;
        let countQuery = `SELECT COUNT(*) FROM user_documents WHERE user_id = $1`;
        const params = [userId];
        let paramIndex = 2;
        if (search) {
            query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            countQuery += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (processed !== undefined) {
            query += ` AND is_processed = $${paramIndex}`;
            countQuery += ` AND is_processed = $${paramIndex}`;
            params.push(processed);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        const mainQueryParams = [...params, limit, offset];
        const [docResult, countResult] = await Promise.all([
            database_1.default.query(query, mainQueryParams),
            database_1.default.query(countQuery, params)
        ]);
        const total = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(total / limit);
        return {
            documents: docResult.rows,
            total,
            page,
            totalPages,
        };
    }
    async getDocumentById(documentId, userId) {
        const result = await database_1.default.query('SELECT * FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
        return result.rows[0] || null;
    }
    async updateDocument(documentId, userId, updates) {
        const allowedFields = ['title', 'description', 'tags', 'is_ai_context_enabled', 'is_processed', 'processing_error'];
        const setClauses = Object.keys(updates)
            .filter(key => allowedFields.includes(key))
            .map((key, i) => `${key} = $${i + 3}`)
            .join(', ');
        if (!setClauses) {
            throw new Error('No valid fields to update.');
        }
        const query = `
      UPDATE user_documents 
      SET ${setClauses} 
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
        const values = [documentId, userId, ...Object.values(updates)];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    }
    async deleteDocument(documentId, userId) {
        const doc = await this.getDocumentById(documentId, userId);
        if (doc && doc.file_path) {
            await promises_1.default.unlink(doc.file_path);
            await this.qdrantService.deleteDocument(documentId);
            await database_1.default.query('DELETE FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
        }
    }
}
exports.DocumentService = DocumentService;
//# sourceMappingURL=documentService.js.map