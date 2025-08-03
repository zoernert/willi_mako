import { UserDocumentChunk } from '../types/workspace';
export declare class DocumentProcessorService {
    private qdrantService;
    private readonly CHUNK_SIZE;
    private readonly CHUNK_OVERLAP;
    constructor();
    processUserDocument(documentId: string, userId: string): Promise<void>;
    extractTextContent(filePath: string, mimeType: string): Promise<string>;
    private createTextChunks;
    createDocumentChunks(documentId: string, userId: string, chunks: string[], documentTitle: string): Promise<void>;
    updateVectorDatabase(documentId: string, userId: string, chunks: string[]): Promise<void>;
    deleteDocumentVectors(documentId: string): Promise<void>;
    private generateVectorId;
    getProcessingStatus(documentId: string, userId: string): Promise<{
        is_processed: boolean;
        chunks_count: number;
        error?: string;
    }>;
    reprocessDocument(documentId: string, userId: string): Promise<void>;
    getDocumentChunks(documentId: string, userId: string): Promise<UserDocumentChunk[]>;
}
//# sourceMappingURL=documentProcessor.d.ts.map