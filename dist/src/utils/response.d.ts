/**
 * Response Utilities - Standardisierte API-Responses
 */
import { Response } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    code?: number;
    timestamp: string;
}
export declare class ResponseUtils {
    /**
     * Success Response
     */
    static success<T>(res: Response, data: T, message?: string, statusCode?: number): Response;
    /**
     * Error Response
     */
    static error(res: Response, message: string, statusCode?: number, error?: any): Response;
    /**
     * Validation Error Response
     */
    static validationError(res: Response, errors: string[]): Response;
    /**
     * Not Found Response
     */
    static notFound(res: Response, resource?: string): Response;
    /**
     * Unauthorized Response
     */
    static unauthorized(res: Response, message?: string): Response;
    /**
     * Forbidden Response
     */
    static forbidden(res: Response, message?: string): Response;
    /**
     * Created Response
     */
    static created<T>(res: Response, data: T, message?: string): Response;
    /**
     * No Content Response
     */
    static noContent(res: Response): Response;
}
//# sourceMappingURL=response.d.ts.map