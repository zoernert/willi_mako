import { UserDocumentChunk } from '../types/workspace';
export declare class DocumentProcessorService {
    private qdrantService;
    private readonly CHUNK_SIZE;
    private readonly CHUNK_OVERLAP;
    constructor();
    /**
     * Process user document: extract text, create chunks, and store in vector DB
     */
    processUserDocument(documentId: string, userId: string): Promise<void>;
    /**
     * Extract text content from various file formats
     */
    extractTextContent(filePath: string, mimeType: string): Promise<string>;
    /**
     * Create text chunks with overlap
     */
    private createTextChunks;
    /**
     * Create document chunks and store in vector database
     */
    createDocumentChunks(documentId: string, userId: string, chunks: string[], documentTitle: string): Promise<void>;
    /**
     * Update vector database with new chunks
     */
    updateVectorDatabase(documentId: string, userId: string, chunks: string[]): Promise<void>;
    /**
     * Delete document vectors from vector database
     */
    deleteDocumentVectors(documentId: string, userId: string): Promise<void>;
    /**
     * Generate consistent vector ID
     */
    private generateVectorId;
    /**
     * Get document processing status
     */
    getProcessingStatus(documentId: string, userId: string): Promise<{
        is_processed: boolean;
        chunks_count: number;
        error?: string;
    }>;
    /**
     * Reprocess document (useful for updates or failed processing)
     */
    reprocessDocument(documentId: string, userId: string): Promise<void>;
    /**
     * Get document chunks for debugging or display
     */
    getDocumentChunks(documentId: string, userId: string): Promise<UserDocumentChunk[]>;
}
//# sourceMappingURL=documentProcessor.d.ts.map