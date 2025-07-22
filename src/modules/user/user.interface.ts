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

export interface User {
  id: string;
  email: string;
  full_name: string;
  company: string;
  role: 'admin' | 'user';
  created_at: string;
  user_profile?: UserProfile;
}

export interface UserPreferences {
  companies_of_interest: string[];
  preferred_topics: string[];
  notification_settings: Record<string, unknown>;
}
