export interface UserPreferences {
    user_id: string;
    companies_of_interest: string[];
    preferred_topics: string[];
    notification_settings: {
        email_notifications?: boolean;
        push_notifications?: boolean;
    };
}
export interface FlipModePreferences {
    user_id: string;
    energy_type?: string;
    stakeholder_perspective?: string;
    context_specificity?: string;
    detail_level?: string;
    topic_focus?: string;
}
//# sourceMappingURL=user.types.d.ts.map