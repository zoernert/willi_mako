interface ChatParityRequest {
    sessionId: string;
    message: string;
    chatId: string;
    contextSettings?: Record<string, any>;
    timelineId?: string;
}
export declare class ChatParityService {
    private readonly baseUrl;
    constructor(baseUrl?: string);
    forwardChat<T = any>(request: ChatParityRequest, authorization: string | undefined, signal?: AbortSignal): Promise<T>;
}
export declare const chatParityService: ChatParityService;
export {};
//# sourceMappingURL=chatParity.service.d.ts.map