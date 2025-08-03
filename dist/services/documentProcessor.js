"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessorService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const database_1 = __importDefault(require("../config/database"));
const qdrant_1 = require("./qdrant");
class DocumentProcessorService {
    constructor() {
        this.CHUNK_SIZE = 1000;
        this.CHUNK_OVERLAP = 200;
        this.qdrantService = new qdrant_1.QdrantService();
    }
    async processUserDocument(documentId, userId) {
        const client = await database_1.default.connect();
        try {
            const documentResult = await client.query('SELECT * FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            if (documentResult.rows.length === 0) {
                throw new Error('Document not found');
            }
            const document = documentResult.rows[0];
            const textContent = await this.extractTextContent(document.file_path, document.mime_type);
            const chunks = this.createTextChunks(textContent);
            await this.createDocumentChunks(documentId, userId, chunks, document.title);
            await client.query('UPDATE user_documents SET is_processed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [documentId]);
        }
        catch (error) {
            console.error('Error processing document:', error);
            await client.query('UPDATE user_documents SET is_processed = false, metadata = metadata || $1 WHERE id = $2', [JSON.stringify({ error: error instanceof Error ? error.message : String(error), processed_at: new Date().toISOString() }), documentId]);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async extractTextContent(filePath, mimeType) {
        const fullPath = path_1.default.join(process.cwd(), filePath);
        if (!fs_1.default.existsSync(fullPath)) {
            throw new Error('File not found');
        }
        const fileBuffer = fs_1.default.readFileSync(fullPath);
        switch (mimeType) {
            case 'application/pdf':
                const pdfData = await (0, pdf_parse_1.default)(fileBuffer);
                return pdfData.text;
            case 'text/plain':
            case 'text/markdown':
                return fileBuffer.toString('utf-8');
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return 'Word document content extraction not yet implemented';
            default:
                throw new Error(`Unsupported file type: ${mimeType}`);
        }
    }
    createTextChunks(text) {
        const chunks = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let currentChunk = '';
        let currentLength = 0;
        for (const sentence of sentences) {
            const sentenceWithPunctuation = sentence.trim() + '.';
            if (currentLength + sentenceWithPunctuation.length > this.CHUNK_SIZE && currentChunk) {
                chunks.push(currentChunk.trim());
                const words = currentChunk.split(' ');
                const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 10));
                currentChunk = overlapWords.join(' ') + ' ' + sentenceWithPunctuation;
                currentLength = currentChunk.length;
            }
            else {
                currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
                currentLength += sentenceWithPunctuation.length;
            }
        }
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }
    async createDocumentChunks(documentId, userId, chunks, documentTitle) {
        const client = await database_1.default.connect();
        try {
            await this.deleteDocumentVectors(documentId);
            for (let i = 0; i < chunks.length; i++) {
                const chunkText = chunks[i];
                const vectorId = this.generateVectorId(documentId, i);
                await this.qdrantService.storeUserDocumentChunk(vectorId, chunkText, documentId, userId, documentTitle, i);
                await client.query(`
          INSERT INTO user_document_chunks 
          (document_id, chunk_index, chunk_text, vector_id, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `, [
                    documentId,
                    i,
                    chunkText,
                    vectorId,
                    JSON.stringify({ document_title: documentTitle, chunk_length: chunkText.length })
                ]);
            }
        }
        finally {
            client.release();
        }
    }
    async updateVectorDatabase(documentId, userId, chunks) {
        await this.createDocumentChunks(documentId, userId, chunks, '');
    }
    async deleteDocumentVectors(documentId) {
        const client = await database_1.default.connect();
        try {
            const chunksResult = await client.query('SELECT vector_id FROM user_document_chunks WHERE document_id = $1', [documentId]);
            for (const chunk of chunksResult.rows) {
                if (chunk.vector_id) {
                    await this.qdrantService.deleteVector(chunk.vector_id);
                }
            }
            await client.query('DELETE FROM user_document_chunks WHERE document_id = $1', [documentId]);
        }
        finally {
            client.release();
        }
    }
    generateVectorId(documentId, chunkIndex) {
        const data = `${documentId}_${chunkIndex}`;
        return crypto_1.default.createHash('md5').update(data).digest('hex');
    }
    async getProcessingStatus(documentId, userId) {
        const client = await database_1.default.connect();
        try {
            const documentResult = await client.query('SELECT is_processed, metadata FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            if (documentResult.rows.length === 0) {
                throw new Error('Document not found');
            }
            const document = documentResult.rows[0];
            const chunksResult = await client.query('SELECT COUNT(*) as count FROM user_document_chunks WHERE document_id = $1', [documentId]);
            const result = {
                is_processed: document.is_processed,
                chunks_count: parseInt(chunksResult.rows[0].count),
                error: document.metadata?.error
            };
            return result;
        }
        finally {
            client.release();
        }
    }
    async reprocessDocument(documentId, userId) {
        const client = await database_1.default.connect();
        try {
            await client.query('UPDATE user_documents SET is_processed = false, metadata = metadata - $1 WHERE id = $2 AND user_id = $3', ['error', documentId, userId]);
            await this.processUserDocument(documentId, userId);
        }
        finally {
            client.release();
        }
    }
    async getDocumentChunks(documentId, userId) {
        const client = await database_1.default.connect();
        try {
            const documentResult = await client.query('SELECT id FROM user_documents WHERE id = $1 AND user_id = $2', [documentId, userId]);
            if (documentResult.rows.length === 0) {
                throw new Error('Document not found');
            }
            const chunksResult = await client.query('SELECT * FROM user_document_chunks WHERE document_id = $1 ORDER BY chunk_index', [documentId]);
            return chunksResult.rows;
        }
        finally {
            client.release();
        }
    }
}
exports.DocumentProcessorService = DocumentProcessorService;
//# sourceMappingURL=documentProcessor.js.map