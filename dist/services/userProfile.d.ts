export interface UserProfile {
    expertise_level: 'beginner' | 'intermediate' | 'advanced';
    communication_style: 'formal' | 'casual' | 'technical' | 'professional';
    preferred_terminology: string[];
    knowledge_areas: string[];
    company_type: string;
    experience_topics: string[];
    learning_progress: {
        completed_topics: string[];
        current_focus: string;
    };
    interaction_patterns: {
        question_types: string[];
        response_preferences: string[];
    };
    last_updated: string;
}
export declare class UserProfileService {
    constructor();
    getUserProfile(userId: string): Promise<UserProfile | null>;
    updateUserProfile(userId: string, userMessage: string, aiResponse: string): Promise<void>;
    private generateUserInsights;
    private mergeProfileInsights;
    private saveUserProfile;
    private getDefaultProfile;
    getUserProfileContext(userId: string): Promise<string>;
}
export default UserProfileService;
//# sourceMappingURL=userProfile.d.ts.map