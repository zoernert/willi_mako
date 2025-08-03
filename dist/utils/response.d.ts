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
    static success<T>(res: Response, data: T, message?: string, statusCode?: number): Response;
    static error(res: Response, message: string, statusCode?: number, error?: any): Response;
    static validationError(res: Response, errors: string[]): Response;
    static notFound(res: Response, resource?: string): Response;
    static unauthorized(res: Response, message?: string): Response;
    static forbidden(res: Response, message?: string): Response;
    static created<T>(res: Response, data: T, message?: string): Response;
    static noContent(res: Response): Response;
}
//# sourceMappingURL=response.d.ts.map