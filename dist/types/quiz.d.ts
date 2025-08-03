export interface Quiz {
    id: string;
    title: string;
    description?: string;
    difficulty_level: 'easy' | 'medium' | 'hard';
    topic_area?: string;
    time_limit_minutes: number;
    question_count: number;
    is_active: boolean;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
    questions?: QuizQuestion[];
}
export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'text';
    correct_answer_index?: number;
    answer_options: string[];
    explanation?: string;
    difficulty_level?: string;
    points: number;
    source_faq_id?: string;
    source_chat_id?: string;
    created_at: Date;
}
export interface UserQuizAttempt {
    id: string;
    user_id: string;
    quiz_id: string;
    start_time: Date;
    end_time?: Date;
    score: number;
    max_score: number;
    percentage: number;
    time_spent_seconds?: number;
    is_completed: boolean;
    answers?: UserAnswer[];
    created_at: Date;
}
export interface UserAnswer {
    question_id: string;
    selected_answer_index?: number;
    selected_answer_text?: string;
    is_correct: boolean;
    time_spent_seconds?: number;
}
export interface UserPoints {
    id: string;
    user_id: string;
    points: number;
    source_type: 'quiz' | 'chat' | 'faq_creation' | 'daily_login' | 'streak';
    source_id?: string;
    earned_at: Date;
    description?: string;
}
export interface UserExpertise {
    id: string;
    user_id: string;
    topic_area: string;
    expertise_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    points_in_topic: number;
    achieved_at: Date;
}
export interface LeaderboardEntry {
    id: string;
    user_id: string;
    display_name: string;
    total_points: number;
    quiz_count: number;
    average_score: number;
    last_activity: Date;
    is_visible: boolean;
}
export interface QuizResult {
    attempt: UserQuizAttempt;
    points_earned: number;
    expertise_updates: ExpertiseUpdate[];
    achievements: Achievement[];
}
export interface ExpertiseUpdate {
    topic_area: string;
    old_level: string;
    new_level: string;
    points_gained: number;
}
export interface Achievement {
    id: string;
    title: string;
    description: string;
    type: 'quiz_master' | 'streak' | 'topic_expert' | 'points_milestone';
    earned_at: Date;
}
export interface QuizSuggestion {
    quiz: Quiz;
    reason: string;
    relevance_score: number;
}
export interface QuizSettings {
    preferred_difficulty: 'easy' | 'medium' | 'hard';
    preferred_topics: string[];
    time_limit_enabled: boolean;
    auto_generate_from_chats: boolean;
    leaderboard_participation: boolean;
}
//# sourceMappingURL=quiz.d.ts.map