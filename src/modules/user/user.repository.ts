import { DatabaseHelper } from '../../utils/database';
import { FlipModePreferences, UserPreferences } from './user.types';

export class UserPreferencesRepository {
    
    public async getFlipModePreferences(userId: string): Promise<FlipModePreferences | null> {
        const sql = 'SELECT * FROM user_flip_mode_preferences WHERE user_id = $1';
        return DatabaseHelper.executeQuerySingle<FlipModePreferences>(sql, [userId]);
    }

    public async upsertFlipModePreferences(preferences: FlipModePreferences): Promise<FlipModePreferences> {
        const {
            user_id,
            energy_type,
            stakeholder_perspective,
            context_specificity,
            detail_level,
            topic_focus,
        } = preferences;

        const sql = `
            INSERT INTO user_flip_mode_preferences (
                user_id, energy_type, stakeholder_perspective, context_specificity, detail_level, topic_focus
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id) DO UPDATE SET
                energy_type = EXCLUDED.energy_type,
                stakeholder_perspective = EXCLUDED.stakeholder_perspective,
                context_specificity = EXCLUDED.context_specificity,
                detail_level = EXCLUDED.detail_level,
                topic_focus = EXCLUDED.topic_focus,
                updated_at = NOW()
            RETURNING *;
        `;

        const result = await DatabaseHelper.executeQuerySingle<FlipModePreferences>(sql, [
            user_id,
            energy_type,
            stakeholder_perspective,
            context_specificity,
            detail_level,
            topic_focus,
        ]);

        if (!result) {
            throw new Error('Failed to upsert flip mode preferences.');
        }
        
        return result;
    }

    public async getUserPreferences(userId: string): Promise<UserPreferences | null> {
        const sql = 'SELECT * FROM user_preferences WHERE user_id = $1';
        const result = await DatabaseHelper.executeQuerySingle<any>(sql, [userId]);
        
        if (!result) {
            return null;
        }
        
        return {
            user_id: result.user_id,
            companies_of_interest: Array.isArray(result.companies_of_interest) ? result.companies_of_interest : [],
            preferred_topics: Array.isArray(result.preferred_topics) ? result.preferred_topics : [],
            notification_settings: result.notification_settings || { email_notifications: false, push_notifications: false }
        };
    }

    public async upsertUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
        const {
            user_id,
            companies_of_interest,
            preferred_topics,
            notification_settings,
        } = preferences;

        const sql = `
            INSERT INTO user_preferences (
                user_id, companies_of_interest, preferred_topics, notification_settings
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE SET
                companies_of_interest = EXCLUDED.companies_of_interest,
                preferred_topics = EXCLUDED.preferred_topics,
                notification_settings = EXCLUDED.notification_settings,
                updated_at = NOW()
            RETURNING *;
        `;

        const result = await DatabaseHelper.executeQuerySingle<any>(sql, [
            user_id,
            JSON.stringify(companies_of_interest || []),
            JSON.stringify(preferred_topics || []),
            JSON.stringify(notification_settings || { email_notifications: false, push_notifications: false }),
        ]);

        if (!result) {
            throw new Error('Failed to upsert user preferences.');
        }
        
        return {
            user_id: result.user_id,
            companies_of_interest: Array.isArray(result.companies_of_interest) ? result.companies_of_interest : [],
            preferred_topics: Array.isArray(result.preferred_topics) ? result.preferred_topics : [],
            notification_settings: result.notification_settings || { email_notifications: false, push_notifications: false }
        };
    }
}

export default new UserPreferencesRepository();
