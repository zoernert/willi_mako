import { IUserRepository } from '../interfaces/user.repository.interface';
import { User, UserProfile, CreateUserRequest, UpdateUserRequest, UserStats } from '../interfaces/user.interface';
/**
 * PostgreSQL User Repository Implementation
 */
export declare class PostgresUserRepository implements IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(filters?: {
        role?: string;
        active?: boolean;
    }): Promise<User[]>;
    create(userData: CreateUserRequest): Promise<User>;
    update(id: string, updates: UpdateUserRequest): Promise<User>;
    delete(id: string): Promise<void>;
    findUserWithPassword(email: string): Promise<User | null>;
    updateLastLogin(id: string): Promise<void>;
    findProfile(userId: string): Promise<UserProfile | null>;
    createProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile>;
    updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
    getUserStats(userId: string): Promise<UserStats>;
    exists(id: string): Promise<boolean>;
    existsByEmail(email: string): Promise<boolean>;
    count(filters?: {
        role?: string;
        active?: boolean;
    }): Promise<number>;
}
//# sourceMappingURL=postgres-user.repository.d.ts.map