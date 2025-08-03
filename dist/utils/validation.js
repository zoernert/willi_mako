"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
class ValidationUtils {
    static validateEmail(email) {
        const errors = [];
        if (!email) {
            errors.push('Email is required');
        }
        else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push('Invalid email format');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static required(value, fieldName) {
        const errors = [];
        if (value === null || value === undefined || value === '') {
            errors.push(`${fieldName} is required`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateUUID(uuid) {
        const errors = [];
        if (!uuid) {
            errors.push('UUID is required');
        }
        else {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(uuid)) {
                errors.push('Invalid UUID format');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static combine(...validations) {
        const allErrors = validations.flatMap(v => v.errors);
        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }
    static sanitizeHtml(input) {
        if (!input)
            return '';
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    static validateLength(value, min, max, fieldName) {
        const errors = [];
        if (!value) {
            errors.push(`${fieldName} is required`);
        }
        else {
            if (value.length < min) {
                errors.push(`${fieldName} must be at least ${min} characters long`);
            }
            if (value.length > max) {
                errors.push(`${fieldName} must be no more than ${max} characters long`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.ValidationUtils = ValidationUtils;
//# sourceMappingURL=validation.js.map