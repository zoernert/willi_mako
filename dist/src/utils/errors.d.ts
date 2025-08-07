/**
 * Error-Handling Utilities - Einheitliche Fehlerbehandlung
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly context?: any;
    constructor(message: string, statusCode?: number, isOperational?: boolean, context?: any);
}
export declare class ValidationError extends AppError {
    constructor(message: string, context?: any);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string, context?: any);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, context?: any);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, context?: any);
}
export declare class ConflictError extends AppError {
    constructor(message: string, context?: any);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string, context?: any);
}
/**
 * Error-Handler-Utilities
 */
export declare class ErrorUtils {
    /**
     * Wraps service operations with standardized error handling
     */
    static handleServiceError<T>(operation: () => Promise<T>, context: string): Promise<T>;
    /**
     * Logs error with structured information
     */
    static logError(error: Error, context?: any): void;
    /**
     * Determines if error should crash the process
     */
    static isTrustedError(error: Error): boolean;
}
//# sourceMappingURL=errors.d.ts.map