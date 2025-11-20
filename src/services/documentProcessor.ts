import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import pool from '../config/database';
import { QdrantService } from './qdrant';
import { UserDocument, UserDocumentChunk } from '../types/workspace';

export class DocumentProcessorService {
  private qdrantService: QdrantService;
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_OVERLAP = 200;

  constructor() {
    this.qdrantService = new QdrantService();
  }

  /**
   * Process user document: extract text, create chunks, and store in vector DB
   */
  async processUserDocument(documentId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Get document info
      const documentResult = await client.query(
        'SELECT * FROM user_documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      const document: UserDocument = documentResult.rows[0];
      
      // Extract text content
      const textContent = await this.extractTextContent(document.file_path!, document.mime_type!);
      
      // Create chunks
      const chunks = this.createTextChunks(textContent);
      
      // Store chunks in database and vector DB
      await this.createDocumentChunks(documentId, userId, chunks, document.title);
      
      // Update document as processed
      await client.query(
        'UPDATE user_documents SET is_processed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [documentId]
      );
      
    } catch (error) {
      console.error('Error processing document:', error);
      // Mark document as failed
      await client.query(
        'UPDATE user_documents SET is_processed = false, metadata = metadata || $1 WHERE id = $2',
        [JSON.stringify({ error: error instanceof Error ? error.message : String(error), processed_at: new Date().toISOString() }), documentId]
      );
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Extract text content from various file formats
   */
  async extractTextContent(filePath: string, mimeType: string): Promise<string> {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }
    
    const fileBuffer = fs.readFileSync(fullPath);
    
    switch (mimeType) {
      case 'application/pdf':
        const pdfData = await pdfParse(fileBuffer);
        return pdfData.text;
        
      case 'text/plain':
      case 'text/markdown':
        return fileBuffer.toString('utf-8');
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // For now, return placeholder. Would need additional library like mammoth
        return 'Word document content extraction not yet implemented';
        
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Create text chunks with overlap
   */
  private createTextChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentLength = 0;
    
    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence.trim() + '.';
      
      if (currentLength + sentenceWithPunctuation.length > this.CHUNK_SIZE && currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 10));
        currentChunk = overlapWords.join(' ') + ' ' + sentenceWithPunctuation;
        currentLength = currentChunk.length;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
        currentLength += sentenceWithPunctuation.length;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Create document chunks and store in vector database
   */
  async createDocumentChunks(documentId: string, userId: string, chunks: string[], documentTitle: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Delete existing chunks
      await this.deleteDocumentVectors(documentId, userId);
      
      // Create new chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        
        // Generate vector ID
        const vectorId = this.generateVectorId(documentId, i);
        
        // Store in vector database
        await this.qdrantService.storeUserDocumentChunk(
          vectorId,
          chunkText,
          documentId,
          userId,
          documentTitle,
          i
        );
        
        // Store chunk metadata in PostgreSQL
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
      
    } finally {
      client.release();
    }
  }

  /**
   * Update vector database with new chunks
   */
  async updateVectorDatabase(documentId: string, userId: string, chunks: string[]): Promise<void> {
    // This method is covered by createDocumentChunks
    await this.createDocumentChunks(documentId, userId, chunks, '');
  }

  /**
   * Delete document vectors from vector database
   */
  async deleteDocumentVectors(documentId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Delete from Qdrant user collection (new: uses user-specific collection)
      await this.qdrantService.deleteDocumentVectors(documentId, userId);
      
      // Delete from PostgreSQL
      await client.query('DELETE FROM user_document_chunks WHERE document_id = $1', [documentId]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Generate consistent vector ID
   */
  private generateVectorId(documentId: string, chunkIndex: number): string {
    const data = `${documentId}_${chunkIndex}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get document processing status
   */
  async getProcessingStatus(documentId: string, userId: string): Promise<{
    is_processed: boolean;
    chunks_count: number;
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      const documentResult = await client.query(
        'SELECT is_processed, metadata FROM user_documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      const document = documentResult.rows[0];
      
      const chunksResult = await client.query(
        'SELECT COUNT(*) as count FROM user_document_chunks WHERE document_id = $1',
        [documentId]
      );
      
      const result = {
        is_processed: document.is_processed,
        chunks_count: parseInt(chunksResult.rows[0].count),
        error: document.metadata?.error
      };
      
      return result;
      
    } finally {
      client.release();
    }
  }

  /**
   * Reprocess document (useful for updates or failed processing)
   */
  async reprocessDocument(documentId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Reset processing status
      await client.query(
        'UPDATE user_documents SET is_processed = false, metadata = metadata - $1 WHERE id = $2 AND user_id = $3',
        ['error', documentId, userId]
      );
      
      // Process document
      await this.processUserDocument(documentId, userId);
      
    } finally {
      client.release();
    }
  }

  /**
   * Get document chunks for debugging or display
   */
  async getDocumentChunks(documentId: string, userId: string): Promise<UserDocumentChunk[]> {
    const client = await pool.connect();
    
    try {
      // Verify user owns the document
      const documentResult = await client.query(
        'SELECT id FROM user_documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      const chunksResult = await client.query(
        'SELECT * FROM user_document_chunks WHERE document_id = $1 ORDER BY chunk_index',
        [documentId]
      );
      
      return chunksResult.rows;
      
    } finally {
      client.release();
    }
  }
}
