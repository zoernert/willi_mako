import { DatabaseHelper } from '../../utils/database';
import { FlipModePreferences } from './user.types';

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
}

export default new UserPreferencesRepository();
