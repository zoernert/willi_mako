"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordUtils = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class PasswordUtils {
    static async hash(password) {
        if (!password) {
            throw new Error('Password is required');
        }
        return await bcryptjs_1.default.hash(password, this.SALT_ROUNDS);
    }
    static async compare(password, hash) {
        if (!password || !hash) {
            return false;
        }
        return await bcryptjs_1.default.compare(password, hash);
    }
    static validatePasswordStrength(password) {
        const errors = [];
        if (!password) {
            errors.push('Password is required');
        }
        else {
            if (password.length < 8) {
                errors.push('Password must be at least 8 characters long');
            }
            if (!/[A-Z]/.test(password)) {
                errors.push('Password must contain at least one uppercase letter');
            }
            if (!/[a-z]/.test(password)) {
                errors.push('Password must contain at least one lowercase letter');
            }
            if (!/\d/.test(password)) {
                errors.push('Password must contain at least one number');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.PasswordUtils = PasswordUtils;
PasswordUtils.SALT_ROUNDS = 12;
//# sourceMappingURL=password.js.map