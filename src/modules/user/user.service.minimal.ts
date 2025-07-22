import { DatabaseHelper } from '../../utils/database';
import { AppError } from '../../utils/errors';
import { PasswordUtils } from '../../utils/password';
import jwt from 'jsonwebtoken';
import { User, CreateUserRequest, LoginRequest, LoginResponse, AuthenticatedUser } from './interfaces/user.interface';

export class UserService {
  /**
   * Register a new user
   */
  async registerUser(userData: CreateUserRequest): Promise<AuthenticatedUser> {
    const { email, name, password, role = 'user' } = userData;

    // Check if user already exists
    const existingUser = await DatabaseHelper.executeQuerySingle<User>(
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
    const newUser = await DatabaseHelper.executeQuerySingle<User>(
      `INSERT INTO users (email, password_hash, role, full_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, full_name as name, created_at`,
      [email, passwordHash, role, name]
    );

    if (!newUser) {
      throw new AppError('Failed to create user', 500);
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
  async loginUser(credentials: LoginRequest): Promise<LoginResponse> {
    const { email, password } = credentials;

    // Find user by email
    const user = await DatabaseHelper.executeQuerySingle<User>(
      'SELECT id, email, password_hash, role, full_name as name FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await PasswordUtils.compare(password, user.password_hash!);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const authenticatedUser: AuthenticatedUser = {
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
  async getUserById(userId: string): Promise<User> {
    const user = await DatabaseHelper.executeQuerySingle<User>(
      'SELECT id, email, role, full_name as name, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * Get user profile - simplified version
   */
  async getUserProfile(userId: string): Promise<User> {
    return this.getUserById(userId);
  }

  /**
   * Update user profile - simplified version
   */
  async updateUserProfile(userId: string, updates: { name?: string; email?: string }): Promise<User> {
    const updateFields: string[] = [];
    const values: any[] = [];
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
      throw new AppError('No fields to update', 400);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, role, full_name as name, created_at, updated_at
    `;

    const updatedUser = await DatabaseHelper.executeQuerySingle<User>(query, values);

    if (!updatedUser) {
      throw new AppError('Failed to update user', 500);
    }

    return updatedUser;
  }

  /**
   * Placeholder methods for preferences - to be implemented later
   */
  async getUserPreferences(userId: string): Promise<any> {
    // TODO: Implement when UserPreferences interface is available
    return { message: 'Preferences not yet implemented' };
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    // TODO: Implement when UserPreferences interface is available
    return { message: 'Preferences not yet implemented' };
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: { id: string; email: string; role: string }): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    
    return jwt.sign(payload, secret, { expiresIn: '24h' });
  }
}

// Export an instance for backward compatibility
export const userService = new UserService();
