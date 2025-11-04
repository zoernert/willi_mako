import { CorrectionDetectionResult } from './types';
interface MessageSnapshot {
    id: string;
    role: string;
    content: string;
    created_at: string | Date;
}
interface DetectAndStoreParams {
    chatId: string;
    userId: string;
    userMessage: {
        id: string;
        content: string;
    };
    assistantMessage?: {
        id: string;
        content: string;
    } | null;
    history: MessageSnapshot[];
}
interface ApprovalOptions {
    vectorText?: string;
    vectorTitle?: string;
    tags?: string[];
    notes?: string;
}
export declare class ChatCorrectionSuggestionService {
    private qdrantClient;
    detectAndStore(params: DetectAndStoreParams): Promise<{
        id: string;
        detection: CorrectionDetectionResult;
    } | null>;
    listSuggestions(status?: string): Promise<any[]>;
    getSuggestion(id: string): Promise<any | null>;
    approveSuggestion(id: string, adminUserId: string, options?: ApprovalOptions): Promise<any>;
    rejectSuggestion(id: string, adminUserId: string, notes?: string): Promise<any>;
    private resolveOriginalQuestion;
    private upsertVector;
}
export declare const chatCorrectionSuggestionService: ChatCorrectionSuggestionService;
export {};
//# sourceMappingURL=chatCorrectionSuggestion.service.d.ts.map