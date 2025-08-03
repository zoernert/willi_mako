"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorUtils = exports.InternalServerError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, context) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, context) {
        super(message, 400, true, context);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource', context) {
        super(`${resource} not found`, 404, true, context);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access', context) {
        super(message, 401, true, context);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden', context) {
        super(message, 403, true, context);
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message, context) {
        super(message, 409, true, context);
    }
}
exports.ConflictError = ConflictError;
class InternalServerError extends AppError {
    constructor(message = 'Internal server error', context) {
        super(message, 500, true, context);
    }
}
exports.InternalServerError = InternalServerError;
class ErrorUtils {
    static async handleServiceError(operation, context) {
        try {
            return await operation();
        }
        catch (error) {
            console.error(`${context} failed:`, {
                message: error.message,
                stack: error.stack,
                context
            });
            if (error instanceof AppError) {
                throw error;
            }
            throw new InternalServerError(`${context} failed: ${error.message}`, { originalError: error.message, context });
        }
    }
    static logError(error, context) {
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
    static isTrustedError(error) {
        if (error instanceof AppError) {
            return error.isOperational;
        }
        return false;
    }
}
exports.ErrorUtils = ErrorUtils;
//# sourceMappingURL=errors.js.map