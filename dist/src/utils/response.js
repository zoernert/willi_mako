"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtils = void 0;
class ResponseUtils {
    /**
     * Success Response
     */
    static success(res, data, message = 'Operation successful', statusCode = 200) {
        const response = {
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
    static error(res, message, statusCode = 500, error) {
        const response = {
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
    static validationError(res, errors) {
        const response = {
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
    static notFound(res, resource = 'Resource') {
        return this.error(res, `${resource} not found`, 404);
    }
    /**
     * Unauthorized Response
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    }
    /**
     * Forbidden Response
     */
    static forbidden(res, message = 'Access forbidden') {
        return this.error(res, message, 403);
    }
    /**
     * Created Response
     */
    static created(res, data, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }
    /**
     * No Content Response
     */
    static noContent(res) {
        return res.status(204).send();
    }
}
exports.ResponseUtils = ResponseUtils;
//# sourceMappingURL=response.js.map