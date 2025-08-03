export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    password_hash?: string;
    created_at?: Date;
    updated_at?: Date;
}
export interface UserProfile {
    id: string;
    user_id: string;
    preferences: Record<string, any>;
    expertise_areas: string[];
    learning_goals: string[];
    performance_metrics: Record<string, number>;
    created_at: Date;
    updated_at: Date;
}
export interface CreateUserRequest {
    email: string;
    name: string;
    password: string;
    role?: 'admin' | 'user';
}
export interface UpdateUserRequest {
    name?: string;
    email?: string;
    role?: 'admin' | 'user';
}
export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    user: AuthenticatedUser;
    token: string;
}
export interface UserStats {
    total_quizzes_completed: number;
    total_documents_uploaded: number;
    total_notes_created: number;
    average_quiz_score: number;
    last_login: Date;
}
//# sourceMappingURL=user.interface.d.ts.map