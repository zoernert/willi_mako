import { User, CreateUserRequest, LoginRequest, LoginResponse, AuthenticatedUser } from './interfaces/user.interface';
export declare class UserService {
    registerUser(userData: CreateUserRequest): Promise<AuthenticatedUser>;
    loginUser(credentials: LoginRequest): Promise<LoginResponse>;
    getUserById(userId: string): Promise<User>;
    getUserProfile(userId: string): Promise<User>;
    updateUserProfile(userId: string, updates: {
        name?: string;
        email?: string;
    }): Promise<User>;
    getUserPreferences(userId: string): Promise<any>;
    updateUserPreferences(userId: string, preferences: any): Promise<any>;
    private generateToken;
}
export declare const userService: UserService;
//# sourceMappingURL=user.service.minimal.d.ts.map