import { User, UserProfile, CreateUserRequest, UpdateUserRequest, UserStats } from '../interfaces/user.interface';

/**
 * User Repository Interface - Data Access Layer
 */
export interface IUserRepository {
  // User CRUD Operations
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(filters?: { role?: string; active?: boolean }): Promise<User[]>;
  create(userData: CreateUserRequest): Promise<User>;
  update(id: string, updates: UpdateUserRequest): Promise<User>;
  delete(id: string): Promise<void>;
  
  // User Authentication
  findUserWithPassword(email: string): Promise<User | null>;
  updateLastLogin(id: string): Promise<void>;
  
  // User Profile Operations
  findProfile(userId: string): Promise<UserProfile | null>;
  createProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  
  // User Statistics
  getUserStats(userId: string): Promise<UserStats>;
  
  // Utility Methods
  exists(id: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  count(filters?: { role?: string; active?: boolean }): Promise<number>;
}
