/**
 * Error-Handling Utilities - Einheitliche Fehlerbehandlung
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: any;

  constructor(
    message: string, 
    statusCode: number = 500, 
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 400, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: any) {
    super(`${resource} not found`, 404, true, context);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', context?: any) {
    super(message, 401, true, context);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', context?: any) {
    super(message, 403, true, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 409, true, context);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: any) {
    super(message, 500, true, context);
  }
}

/**
 * Error-Handler-Utilities
 */
export class ErrorUtils {
  
  /**
   * Wraps service operations with standardized error handling
   */
  static async handleServiceError<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`${context} failed:`, {
        message: error.message,
        stack: error.stack,
        context
      });

      if (error instanceof AppError) {
        throw error;
      }

      // Convert unknown errors to AppError
      throw new InternalServerError(
        `${context} failed: ${error.message}`,
        { originalError: error.message, context }
      );
    }
  }

  /**
   * Logs error with structured information
   */
  static logError(error: Error, context?: any): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context
    };

    if (error instanceof AppError) {
      errorInfo.context = {
        ...errorInfo.context,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        errorContext: error.context
      };
    }

    console.error('Error occurred:', errorInfo);
  }

  /**
   * Determines if error should crash the process
   */
  static isTrustedError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }

    return false;
  }
}
