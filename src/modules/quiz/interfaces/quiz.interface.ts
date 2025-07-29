/**
 * Core Quiz Domain Interfaces
 * Definiert die grundlegenden Datenstrukturen für Quiz-Funktionalität
 */

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
  correct_answer_index?: number; // Legacy field for backward compatibility
  correct_answers?: number[]; // New field for multiple correct answers support
  answer_options: string[];
  explanation?: string;
  difficulty_level?: string;
  points: number;
  source_faq_id?: string;
  source_chat_id?: string;
  topic?: string; // Added topic field
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
  points_awarded: number;
  time_spent_seconds?: number;
}

export interface QuizLeaderboard {
  id: string;
  user_id: string;
  quiz_id: string;
  username: string;
  best_score: number;
  best_percentage: number;
  best_time_seconds?: number;
  attempts_count: number;
  first_attempt_date: Date;
  best_attempt_date: Date;
}

export interface QuizCreateRequest {
  title: string;
  description?: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  topic_area?: string;
  time_limit_minutes: number;
  is_active?: boolean;
}

export interface QuestionCreateRequest {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'text';
  answer_options: string[];
  correct_answer_index?: number;
  explanation?: string;
  difficulty_level?: string;
  points: number;
  source_faq_id?: string;
  source_chat_id?: string;
}

export interface QuizSearchQuery {
  title?: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  topic_area?: string;
  is_active?: boolean;
  created_by?: string;
  limit?: number;
  offset?: number;
}

export interface QuizSearchResult {
  quizzes: Quiz[];
  total_count: number;
  has_more: boolean;
}

export interface QuizAttemptRequest {
  user_id: string;
  quiz_id: string;
}

export interface QuizSubmissionRequest {
  attempt_id: string;
  answers: {
    question_id: string;
    selected_answer_index?: number;
    selected_answer_text?: string;
  }[];
}

export interface QuizStatistics {
  total_attempts: number;
  average_score: number;
  completion_rate: number;
  average_time_seconds: number;
  difficulty_distribution: Record<string, number>;
  score_distribution: {
    range: string;
    count: number;
  }[];
}
