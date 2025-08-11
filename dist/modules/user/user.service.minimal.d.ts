import { User, CreateUserRequest, LoginRequest, LoginResponse, AuthenticatedUser } from './interfaces/user.interface';
export declare class UserService {
    /**
     * Register a new user
     */
    registerUser(userData: CreateUserRequest): Promise<AuthenticatedUser>;
    /**
     * Login user
     */
    loginUser(credentials: LoginRequest): Promise<LoginResponse>;
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<User>;
    /**
     * Get user profile - simplified version
     */
    getUserProfile(userId: string): Promise<User>;
    /**
     * Update user profile - simplified version
     */
    updateUserProfile(userId: string, updates: {
        name?: string;
        email?: string;
    }): Promise<User>;
    /**
     * Placeholder methods for preferences - to be implemented later
     */
    getUserPreferences(userId: string): Promise<any>;
    updateUserPreferences(userId: string, preferences: any): Promise<any>;
    /**
     * Generate JWT token
     */
    private generateToken;
}
export declare const userService: UserService;
//# sourceMappingURL=user.service.minimal.d.ts.map