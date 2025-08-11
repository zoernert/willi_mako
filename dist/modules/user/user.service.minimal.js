"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const database_1 = require("../../utils/database");
const errors_1 = require("../../utils/errors");
const password_1 = require("../../utils/password");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class UserService {
    /**
     * Register a new user
     */
    async registerUser(userData) {
        const { email, name, password, role = 'user' } = userData;
        // Check if user already exists
        const existingUser = await database_1.DatabaseHelper.executeQuerySingle('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser) {
            throw new errors_1.AppError('User with this email already exists', 409);
        }
        // Validate password strength
        const passwordValidation = password_1.PasswordUtils.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            throw new errors_1.AppError(`Invalid password: ${passwordValidation.errors.join(', ')}`, 400);
        }
        // Hash password
        const passwordHash = await password_1.PasswordUtils.hash(password);
        // Create user
        const newUser = await database_1.DatabaseHelper.executeQuerySingle(`INSERT INTO users (email, password_hash, role, full_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, full_name as name, created_at`, [email, passwordHash, role, name]);
        if (!newUser) {
            throw new errors_1.AppError('Failed to create user', 500);
        }
        return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role
        };
    }
    /**
     * Login user
     */
    async loginUser(credentials) {
        const { email, password } = credentials;
        // Find user by email
        const user = await database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, password_hash, role, full_name as name FROM users WHERE email = $1', [email]);
        if (!user) {
            throw new errors_1.AppError('Invalid credentials', 401);
        }
        // Verify password
        const isValidPassword = await password_1.PasswordUtils.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new errors_1.AppError('Invalid credentials', 401);
        }
        // Generate JWT token
        const token = this.generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });
        const authenticatedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        return {
            user: authenticatedUser,
            token
        };
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, role, full_name as name, created_at, updated_at FROM users WHERE id = $1', [userId]);
        if (!user) {
            throw new errors_1.AppError('User not found', 404);
        }
        return user;
    }
    /**
     * Get user profile - simplified version
     */
    async getUserProfile(userId) {
        return this.getUserById(userId);
    }
    /**
     * Update user profile - simplified version
     */
    async updateUserProfile(userId, updates) {
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        if (updates.name) {
            updateFields.push(`full_name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.email) {
            updateFields.push(`email = $${paramIndex++}`);
            values.push(updates.email);
        }
        if (updateFields.length === 0) {
            throw new errors_1.AppError('No fields to update', 400);
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);
        const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, role, full_name as name, created_at, updated_at
    `;
        const updatedUser = await database_1.DatabaseHelper.executeQuerySingle(query, values);
        if (!updatedUser) {
            throw new errors_1.AppError('Failed to update user', 500);
        }
        return updatedUser;
    }
    /**
     * Placeholder methods for preferences - to be implemented later
     */
    async getUserPreferences(userId) {
        // TODO: Implement when UserPreferences interface is available
        return { message: 'Preferences not yet implemented' };
    }
    async updateUserPreferences(userId, preferences) {
        // TODO: Implement when UserPreferences interface is available
        return { message: 'Preferences not yet implemented' };
    }
    /**
     * Generate JWT token
     */
    generateToken(payload) {
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '24h' });
    }
}
exports.UserService = UserService;
// Export an instance for backward compatibility
exports.userService = new UserService();
//# sourceMappingURL=user.service.minimal.js.map