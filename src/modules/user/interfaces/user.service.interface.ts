import { AuthenticatedUser, LoginRequest, LoginResponse, CreateUserRequest, User, UserProfile, UserStats } from '../interfaces/user.interface';

/**
 * User Service Interface - Business Logic Layer
 */
export interface IUserService {
  // Authentication
  login(credentials: LoginRequest): Promise<LoginResponse>;
  register(userData: CreateUserRequest): Promise<LoginResponse>;
  refreshToken(token: string): Promise<LoginResponse>;
  resetPassword(email: string, newPassword: string): Promise<void>;
  
  // User Management
  getUserById(id: string): Promise<User | null>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  getUserStats(userId: string): Promise<UserStats>;
  
  // Admin Operations
  getAllUsers(filters?: { role?: string; active?: boolean }): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Utility Operations
  validateUserAccess(userId: string, requiredRole?: string): Promise<boolean>;
  getUserCount(): Promise<number>;
}
