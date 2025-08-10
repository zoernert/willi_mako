import { PatchOperation, ThreadStatus } from '../types/community';
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidUUID: (uuid: string) => boolean;
export declare const isValidThreadStatus: (status: string) => status is ThreadStatus;
export declare const validateString: (value: any, fieldName: string, options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
}) => string;
export declare const validateArray: (value: any, fieldName: string, options?: {
    required?: boolean;
    maxLength?: number;
    itemValidator?: (item: any) => void;
}) => any[];
export declare const validatePatchOperation: (op: any) => PatchOperation;
export declare const validateCreateThreadRequest: (data: any) => void;
export declare const validateUpdateDocumentRequest: (data: any) => void;
export declare const validateCreateCommentRequest: (data: any) => void;
export declare const validateStatusTransition: (currentStatus: string, newStatus: string) => boolean;
export declare const validateCommunityEnv: () => {
    QDRANT_COMMUNITY_COLLECTION: string;
    COMMUNITY_MAX_PROPOSALS: number;
    COMMUNITY_ENABLE_PUBLIC_READ: boolean;
    FEATURE_COMMUNITY_HUB: boolean;
    FEATURE_COMMUNITY_ESCALATION: boolean;
};
export declare const RATE_LIMITS: {
    readonly PATCH_OPS_PER_5MIN: 30;
    readonly COMMENTS_PER_5MIN: 10;
    readonly THREADS_PER_HOUR: 5;
};
//# sourceMappingURL=communityValidation.d.ts.map