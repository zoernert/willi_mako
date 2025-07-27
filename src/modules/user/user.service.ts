import { FlipModePreferences, UserPreferences } from './user.types';
import UserPreferencesRepository from './user.repository';

export class UserPreferencesService {

    public async getFlipModePreferences(userId: string): Promise<FlipModePreferences | null> {
        return UserPreferencesRepository.getFlipModePreferences(userId);
    }

    public async saveFlipModePreferences(userId: string, preferences: Partial<FlipModePreferences>): Promise<FlipModePreferences> {
        const existingPrefs = await this.getFlipModePreferences(userId) || { user_id: userId };

        const newPrefs: FlipModePreferences = {
            user_id: userId,
            energy_type: preferences.energy_type ?? existingPrefs.energy_type,
            stakeholder_perspective: preferences.stakeholder_perspective ?? existingPrefs.stakeholder_perspective,
            context_specificity: preferences.context_specificity ?? existingPrefs.context_specificity,
            detail_level: preferences.detail_level ?? existingPrefs.detail_level,
            topic_focus: preferences.topic_focus ?? existingPrefs.topic_focus,
        };
        
        return UserPreferencesRepository.upsertFlipModePreferences(newPrefs);
    }

    public async getUserPreferences(userId: string): Promise<UserPreferences> {
        const preferences = await UserPreferencesRepository.getUserPreferences(userId);
        
        // Return default preferences if none exist
        if (!preferences) {
            return {
                user_id: userId,
                companies_of_interest: [],
                preferred_topics: [],
                notification_settings: {
                    email_notifications: false,
                    push_notifications: false,
                }
            };
        }
        
        return preferences;
    }

    public async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        const existingPrefs = await this.getUserPreferences(userId);

        const newPrefs: UserPreferences = {
            user_id: userId,
            companies_of_interest: preferences.companies_of_interest ?? existingPrefs.companies_of_interest,
            preferred_topics: preferences.preferred_topics ?? existingPrefs.preferred_topics,
            notification_settings: {
                email_notifications: preferences.notification_settings?.email_notifications ?? existingPrefs.notification_settings.email_notifications,
                push_notifications: preferences.notification_settings?.push_notifications ?? existingPrefs.notification_settings.push_notifications,
            }
        };
        
        return UserPreferencesRepository.upsertUserPreferences(newPrefs);
    }
}

export default new UserPreferencesService();