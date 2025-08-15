export interface UserPreferences {
    companies_of_interest: string[];
    preferred_topics: string[];
    notification_settings: {
      email_notifications?: boolean;
      push_notifications?: boolean;
    };
  }
  
  export interface FlipModePreferences {
    energy_type?: string;
    stakeholder_perspective?: string;
    context_specificity?: string;
    detail_level?: string;
    topic_focus?: string;
  }
  
  export interface UserProfile {
    name: string;
    company: string;
  }
  
  export interface User {
    id: string;
    email: string;
    name: string; // Changed from full_name to align with frontend components
    company: string;
    role: 'admin' | 'user';
    created_at: string;
    preferences?: UserPreferences;
    flip_mode_preferences?: FlipModePreferences;
    can_access_cs30?: boolean; // CR-CS30: Added CS30 access flag
  }
