import { Request, Response, NextFunction } from 'express';
import { ResponseUtils } from '../../../utils/response';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { PasswordUtils } from '../../../utils/password';
import { DatabaseHelper } from '../../../utils/database';
import { AppError } from '../../../utils/errors';
import jwt from 'jsonwebtoken';

export class UserController {

    public registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, name, password, role = 'user' } = req.body;

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
                `INSERT INTO users (email, password_hash, role, full_name) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, email, role, full_name as name, created_at`,
                [email, passwordHash, role, name]
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
                'SELECT id, email, password_hash, role, full_name as name FROM users WHERE email = $1',
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
            }>(
                'SELECT id, email, role, full_name as name, created_at, updated_at FROM users WHERE id = $1',
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
                 SET full_name = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING id, email, role, full_name as name, created_at, updated_at`,
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
            // Placeholder implementation
            ResponseUtils.success(res, { message: 'Preferences not yet implemented' });
        } catch (error) {
            next(error);
        }
    };

    public updateUserPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Placeholder implementation
            ResponseUtils.success(res, { message: 'Preferences not yet implemented' });
        } catch (error) {
            next(error);
        }
    };
}
