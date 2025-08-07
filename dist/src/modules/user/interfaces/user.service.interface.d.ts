import { LoginRequest, LoginResponse, CreateUserRequest, User, UserProfile, UserStats } from '../interfaces/user.interface';
/**
 * User Service Interface - Business Logic Layer
 */
export interface IUserService {
    login(credentials: LoginRequest): Promise<LoginResponse>;
    register(userData: CreateUserRequest): Promise<LoginResponse>;
    refreshToken(token: string): Promise<LoginResponse>;
    resetPassword(email: string, newPassword: string): Promise<void>;
    getUserById(id: string): Promise<User | null>;
    getUserProfile(userId: string): Promise<UserProfile | null>;
    updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
    getUserStats(userId: string): Promise<UserStats>;
    getAllUsers(filters?: {
        role?: string;
        active?: boolean;
    }): Promise<User[]>;
    updateUser(id: string, updates: Partial<User>): Promise<User>;
    deleteUser(id: string): Promise<void>;
    validateUserAccess(userId: string, requiredRole?: string): Promise<boolean>;
    getUserCount(): Promise<number>;
}
//# sourceMappingURL=user.service.interface.d.ts.map