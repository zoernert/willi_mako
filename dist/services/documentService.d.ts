import { UserDocument } from '../types/workspace';
export declare class DocumentService {
    private qdrantService;
    constructor();
    createDocument(userId: string, data: {
        file: Express.Multer.File;
        title: string;
        description?: string;
        tags?: string[];
        is_ai_context_enabled?: boolean;
    }): Promise<UserDocument>;
    processAndIndexDocument(documentId: string, userId: string): Promise<void>;
    /**
     * Split text into chunks with overlap for better context preservation
     */
    private chunkText;
    getUserDocuments(userId: string, options: {
        page: number;
        limit: number;
        search?: string;
        processed?: boolean;
    }): Promise<{
        documents: UserDocument[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getDocumentById(documentId: string, userId: string): Promise<UserDocument | null>;
    updateDocument(documentId: string, userId: string, updates: Partial<UserDocument>): Promise<UserDocument>;
    deleteDocument(documentId: string, userId: string): Promise<void>;
}
//# sourceMappingURL=documentService.d.ts.map