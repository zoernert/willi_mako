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

export class ResponseUtils {
  
  /**
   * Success Response
   */
  static success<T>(
    res: Response, 
    data: T, 
    message: string = 'Operation successful',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Error Response
   */
  static error(
    res: Response, 
    message: string, 
    statusCode: number = 500,
    error?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: statusCode,
      timestamp: new Date().toISOString()
    };
    
    // Log error details for debugging
    if (error) {
      console.error('API Error:', {
        message,
        statusCode,
        error: error.message || error,
        stack: error.stack
      });
    }
    
    return res.status(statusCode).json(response);
  }

  /**
   * Validation Error Response
   */
  static validationError(
    res: Response, 
    errors: string[]
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      data: { validationErrors: errors },
      code: 400,
      timestamp: new Date().toISOString()
    };
    
    return res.status(400).json(response);
  }

  /**
   * Not Found Response
   */
  static notFound(
    res: Response, 
    resource: string = 'Resource'
  ): Response {
    return this.error(res, `${resource} not found`, 404);
  }

  /**
   * Unauthorized Response
   */
  static unauthorized(
    res: Response, 
    message: string = 'Unauthorized access'
  ): Response {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden Response
   */
  static forbidden(
    res: Response, 
    message: string = 'Access forbidden'
  ): Response {
    return this.error(res, message, 403);
  }

  /**
   * Created Response
   */
  static created<T>(
    res: Response, 
    data: T, 
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  /**
   * No Content Response
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
