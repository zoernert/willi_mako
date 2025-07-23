import { FlipModePreferences } from './user.types';
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
}

export default new UserPreferencesService();