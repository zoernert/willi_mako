import { Request, Response, NextFunction } from 'express';
import { ResponseUtils } from '../../../utils/response';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { PasswordUtils } from '../../../utils/password';
import { DatabaseHelper } from '../../../utils/database';
import { AppError } from '../../../utils/errors';
import jwt from 'jsonwebtoken';
import UserPreferencesService from '../../../modules/user/user.service';
import UserAIKeyService from '../../../services/userAIKeyService';

export class UserController {

    public registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, name, password, role = 'user' } = req.body;

            // Validate required fields
            if (!email || !name || !password) {
                throw new AppError('Email, name, and password are required', 400);
            }

            console.log('Registration request:', { email, name, password: '***', role });

            // Check if user already exists
            const existingUser = await DatabaseHelper.executeQuerySingle<{id: string}>(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser) {
                throw new AppError('User with this email already exists', 409);
            }

            // Validate password strength
            const passwordValidation = PasswordUtils.validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                throw new AppError(`Invalid password: ${passwordValidation.errors.join(', ')}`, 400);
            }

            // Hash password
            const passwordHash = await PasswordUtils.hash(password);

            // Create user
            const newUser = await DatabaseHelper.executeQuerySingle<{
                id: string;
                email: string;
                name: string;
                role: string;
                created_at: Date;
            }>(
                `INSERT INTO users (email, password_hash, role, name, full_name) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, email, role, name, created_at`,
                [email, passwordHash, role, name, name]
            );

            if (!newUser) {
                throw new AppError('Failed to create user', 500);
            }

            const user = {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role
            };

            ResponseUtils.success(res, { user }, 'User registered successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    public loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await DatabaseHelper.executeQuerySingle<{
                id: string;
                email: string;
                password_hash: string;
                role: string;
                name: string;
            }>(
                'SELECT id, email, password_hash, role, name FROM users WHERE email = $1',
                [email]
            );

            if (!user) {
                throw new AppError('Invalid credentials', 401);
            }

            // Verify password
            const isValidPassword = await PasswordUtils.compare(password, user.password_hash);
            if (!isValidPassword) {
                throw new AppError('Invalid credentials', 401);
            }

            // Generate JWT token
            const secret = process.env.JWT_SECRET || 'fallback-secret';
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role }, 
                secret, 
                { expiresIn: '24h' }
            );

            const authenticatedUser = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            };

            ResponseUtils.success(res, { user: authenticatedUser, token }, 'Login successful');
        } catch (error) {
            next(error);
        }
    };

    public getUserProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const user = await DatabaseHelper.executeQuerySingle<{
                id: string;
                email: string;
                role: string;
                name: string;
                created_at: Date;
                updated_at: Date;
                can_access_cs30: boolean; // CR-CS30: Include CS30 access flag
            }>(
                'SELECT id, email, role, name, created_at, updated_at, can_access_cs30 FROM users WHERE id = $1',
                [userId]
            );

            if (!user) {
                throw new AppError('User not found', 404);
            }

            ResponseUtils.success(res, user);
        } catch (error) {
            next(error);
        }
    };

    public updateUserProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { name, company } = req.body;
            
            // Simple update (company field is ignored as it's not in our schema)
            const updatedUser = await DatabaseHelper.executeQuerySingle<{
                id: string;
                email: string;
                role: string;
                name: string;
                created_at: Date;
                updated_at: Date;
            }>(
                `UPDATE users 
                 SET name = $1, full_name = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING id, email, role, name, created_at, updated_at`,
                [name, userId]
            );

            if (!updatedUser) {
                throw new AppError('Failed to update user', 500);
            }

            ResponseUtils.success(res, updatedUser);
        } catch (error) {
            next(error);
        }
    };

    public getUserPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const preferences = await UserPreferencesService.getUserPreferences(userId);
            ResponseUtils.success(res, preferences, 'User preferences retrieved successfully.');
        } catch (error) {
            next(error);
        }
    };

    public updateUserPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const preferences = req.body;
            const updatedPreferences = await UserPreferencesService.saveUserPreferences(userId, preferences);
            ResponseUtils.success(res, updatedPreferences, 'User preferences updated successfully.');
        } catch (error) {
            next(error);
        }
    };

    public getFlipModePreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const preferences = await UserPreferencesService.getFlipModePreferences(userId);
            ResponseUtils.success(res, preferences, 'Flip mode preferences retrieved successfully.');
        } catch (error) {
            next(error);
        }
    };

    public updateFlipModePreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const preferences = req.body;
            const updatedPreferences = await UserPreferencesService.saveFlipModePreferences(userId, preferences);
            ResponseUtils.success(res, updatedPreferences, 'Flip mode preferences updated successfully.');
        } catch (error) {
            next(error);
        }
    };

    public getUserStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new AppError('User not authenticated', 401);
            }
            
            const userId = req.user.id;

            // Get total chats count
            const totalChatsResult = await DatabaseHelper.executeQuerySingle<{ count: string }>(
                'SELECT COUNT(*) as count FROM chats WHERE user_id = $1',
                [userId]
            );

            // Get total messages count (user messages only)
            const totalMessagesResult = await DatabaseHelper.executeQuerySingle<{ count: string }>(
                'SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1 AND m.role = $2',
                [userId, 'user']
            );

            // Get recent activity (messages in last 30 days)
            const recentActivityResult = await DatabaseHelper.executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM messages m 
                 JOIN chats c ON m.chat_id = c.id 
                 WHERE c.user_id = $1 AND m.role = $2 AND m.created_at >= NOW() - INTERVAL '30 days'`,
                [userId, 'user']
            );

            const stats = {
                totalChats: parseInt(totalChatsResult?.count || '0'),
                totalMessages: parseInt(totalMessagesResult?.count || '0'),
                recentActivity: parseInt(recentActivityResult?.count || '0')
            };

            ResponseUtils.success(res, stats, 'User statistics retrieved successfully');
        } catch (error) {
            console.error('Error fetching user stats:', error);
            next(error);
        }
    };

    // AI key management
    public getUserAIKeyStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const status = await UserAIKeyService.getUserGeminiKeyStatus(userId);
            ResponseUtils.success(res, status);
        } catch (error) {
            next(error);
        }
    };

    public setUserAIKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { apiKey } = req.body || {};
            if (!apiKey || typeof apiKey !== 'string') {
                throw new AppError('apiKey is required', 400);
            }
            const result = await UserAIKeyService.setUserGeminiKey(userId, apiKey.trim());
            ResponseUtils.success(res, result, 'API key saved');
        } catch (error) {
            next(error);
        }
    };

    public deleteUserAIKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            await UserAIKeyService.deleteUserGeminiKey(userId);
            ResponseUtils.success(res, { deleted: true }, 'API key removed');
        } catch (error) {
            next(error);
        }
    };
}

