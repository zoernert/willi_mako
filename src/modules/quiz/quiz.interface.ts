export interface Quiz {
    id: string;
    title: string;
    description: string;
    difficulty_level: 'easy' | 'medium' | 'hard';
    topic_area: string;
    time_limit_minutes: number;
    question_count: number;
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
    questions?: QuizQuestion[];
    attempt_count?: number;
    best_score?: number;
  }
  
  export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_text: string;
    question_type: 'multiple-choice' | 'single-choice' | 'true-false' | 'short-answer';
    answer_options: string[];
    correct_answers: string[];
    explanation: string;
    difficulty_level: 'easy' | 'medium' | 'hard';
    points: number;
    topic?: string;
    created_at?: string;
  }
  
  export interface UserQuizAttempt {
    id: string;
    user_id: string;
    quiz_id: string;
    started_at: string;
    completed_at?: string;
    score: number;
    percentage: number;
    is_passed: boolean;
    time_taken_seconds: number;
    answers?: UserAnswer[];
  }
  
  export interface UserAnswer {
    question_id: string;
    answer: string[];
  }
  
  export interface QuizResult {
    attempt: UserQuizAttempt;
    correct_answers: number;
    total_questions: number;
    feedback: QuestionFeedback[];
    badge_earned?: any;
  }
  
  export interface QuestionFeedback {
    question_id: string;
    question_text: string;
    user_answer: string[];
    correct_answers: string[];
    is_correct: boolean;
    explanation: string;
  }
  
  export interface QuizSuggestion {
    quiz: Quiz;
    reason: string;
    relevance_score: number;
  }

  // Gamification interfaces
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

  export interface Achievement {
    id: string;
    title: string;
    description: string;
    type: 'quiz_master' | 'streak' | 'topic_expert' | 'points_milestone';
    user_id: string;
    earned_at: Date;
    is_visible: boolean;
  }

  export interface ExpertiseUpdate {
    topic_area: string;
    old_level: string;
    new_level: string;
    points_earned: number;
  }
