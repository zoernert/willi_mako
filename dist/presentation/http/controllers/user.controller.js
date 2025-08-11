"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const response_1 = require("../../../utils/response");
const password_1 = require("../../../utils/password");
const database_1 = require("../../../utils/database");
const errors_1 = require("../../../utils/errors");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_service_1 = __importDefault(require("../../../modules/user/user.service"));
class UserController {
    constructor() {
        this.registerUser = async (req, res, next) => {
            try {
                const { email, name, password, role = 'user' } = req.body;
                // Validate required fields
                if (!email || !name || !password) {
                    throw new errors_1.AppError('Email, name, and password are required', 400);
                }
                console.log('Registration request:', { email, name, password: '***', role });
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
                const newUser = await database_1.DatabaseHelper.executeQuerySingle(`INSERT INTO users (email, password_hash, role, name, full_name) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, email, role, name, created_at`, [email, passwordHash, role, name, name]);
                if (!newUser) {
                    throw new errors_1.AppError('Failed to create user', 500);
                }
                const user = {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role
                };
                response_1.ResponseUtils.success(res, { user }, 'User registered successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.loginUser = async (req, res, next) => {
            try {
                const { email, password } = req.body;
                // Find user by email
                const user = await database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, password_hash, role, name FROM users WHERE email = $1', [email]);
                if (!user) {
                    throw new errors_1.AppError('Invalid credentials', 401);
                }
                // Verify password
                const isValidPassword = await password_1.PasswordUtils.compare(password, user.password_hash);
                if (!isValidPassword) {
                    throw new errors_1.AppError('Invalid credentials', 401);
                }
                // Generate JWT token
                const secret = process.env.JWT_SECRET || 'fallback-secret';
                const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '24h' });
                const authenticatedUser = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                };
                response_1.ResponseUtils.success(res, { user: authenticatedUser, token }, 'Login successful');
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserProfile = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const user = await database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, role, name, created_at, updated_at FROM users WHERE id = $1', [userId]);
                if (!user) {
                    throw new errors_1.AppError('User not found', 404);
                }
                response_1.ResponseUtils.success(res, user);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateUserProfile = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { name, company } = req.body;
                // Simple update (company field is ignored as it's not in our schema)
                const updatedUser = await database_1.DatabaseHelper.executeQuerySingle(`UPDATE users 
                 SET name = $1, full_name = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING id, email, role, name, created_at, updated_at`, [name, userId]);
                if (!updatedUser) {
                    throw new errors_1.AppError('Failed to update user', 500);
                }
                response_1.ResponseUtils.success(res, updatedUser);
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserPreferences = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const preferences = await user_service_1.default.getUserPreferences(userId);
                response_1.ResponseUtils.success(res, preferences, 'User preferences retrieved successfully.');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateUserPreferences = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const preferences = req.body;
                const updatedPreferences = await user_service_1.default.saveUserPreferences(userId, preferences);
                response_1.ResponseUtils.success(res, updatedPreferences, 'User preferences updated successfully.');
            }
            catch (error) {
                next(error);
            }
        };
        this.getFlipModePreferences = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const preferences = await user_service_1.default.getFlipModePreferences(userId);
                response_1.ResponseUtils.success(res, preferences, 'Flip mode preferences retrieved successfully.');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateFlipModePreferences = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const preferences = req.body;
                const updatedPreferences = await user_service_1.default.saveFlipModePreferences(userId, preferences);
                response_1.ResponseUtils.success(res, updatedPreferences, 'Flip mode preferences updated successfully.');
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserStats = async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new errors_1.AppError('User not authenticated', 401);
                }
                const userId = req.user.id;
                // Get total chats count
                const totalChatsResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM chats WHERE user_id = $1', [userId]);
                // Get total messages count (user messages only)
                const totalMessagesResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1 AND m.role = $2', [userId, 'user']);
                // Get recent activity (messages in last 30 days)
                const recentActivityResult = await database_1.DatabaseHelper.executeQuerySingle(`SELECT COUNT(*) as count FROM messages m 
                 JOIN chats c ON m.chat_id = c.id 
                 WHERE c.user_id = $1 AND m.role = $2 AND m.created_at >= NOW() - INTERVAL '30 days'`, [userId, 'user']);
                const stats = {
                    totalChats: parseInt((totalChatsResult === null || totalChatsResult === void 0 ? void 0 : totalChatsResult.count) || '0'),
                    totalMessages: parseInt((totalMessagesResult === null || totalMessagesResult === void 0 ? void 0 : totalMessagesResult.count) || '0'),
                    recentActivity: parseInt((recentActivityResult === null || recentActivityResult === void 0 ? void 0 : recentActivityResult.count) || '0')
                };
                response_1.ResponseUtils.success(res, stats, 'User statistics retrieved successfully');
            }
            catch (error) {
                console.error('Error fetching user stats:', error);
                next(error);
            }
        };
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map