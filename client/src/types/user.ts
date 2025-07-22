export interface UserPreferences {
    companies_of_interest: string[];
    preferred_topics: string[];
    notification_settings: {
      email_notifications?: boolean;
      push_notifications?: boolean;
    };
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
  }
