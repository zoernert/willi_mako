export type KeyStatus = 'unknown' | 'valid' | 'invalid';
export declare const UserAIKeyService: {
    setUserGeminiKey(userId: string, apiKey: string): Promise<any>;
    deleteUserGeminiKey(userId: string): Promise<void>;
    getUserGeminiKeyStatus(userId: string): Promise<{
        hasKey: boolean;
        status: KeyStatus;
        lastVerifiedAt: Date;
        systemKeyAllowed: boolean;
    }>;
    setSystemKeyAccess(userId: string, allowed: boolean): Promise<void>;
    resolveGeminiApiKey(userId: string): Promise<{
        key: string | null;
        source: "user" | "system" | null;
    }>;
    verifyUserGeminiKey(userId: string): Promise<{
        status: KeyStatus;
        lastVerifiedAt: Date | null;
    }>;
};
export default UserAIKeyService;
//# sourceMappingURL=userAIKeyService.d.ts.map