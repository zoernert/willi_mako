"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPreferencesService = void 0;
const user_repository_1 = __importDefault(require("./user.repository"));
class UserPreferencesService {
    async getFlipModePreferences(userId) {
        return user_repository_1.default.getFlipModePreferences(userId);
    }
    async saveFlipModePreferences(userId, preferences) {
        const existingPrefs = await this.getFlipModePreferences(userId) || { user_id: userId };
        const newPrefs = {
            user_id: userId,
            energy_type: preferences.energy_type ?? existingPrefs.energy_type,
            stakeholder_perspective: preferences.stakeholder_perspective ?? existingPrefs.stakeholder_perspective,
            context_specificity: preferences.context_specificity ?? existingPrefs.context_specificity,
            detail_level: preferences.detail_level ?? existingPrefs.detail_level,
            topic_focus: preferences.topic_focus ?? existingPrefs.topic_focus,
        };
        return user_repository_1.default.upsertFlipModePreferences(newPrefs);
    }
    async getUserPreferences(userId) {
        const preferences = await user_repository_1.default.getUserPreferences(userId);
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
    async saveUserPreferences(userId, preferences) {
        const existingPrefs = await this.getUserPreferences(userId);
        const newPrefs = {
            user_id: userId,
            companies_of_interest: preferences.companies_of_interest ?? existingPrefs.companies_of_interest,
            preferred_topics: preferences.preferred_topics ?? existingPrefs.preferred_topics,
            notification_settings: {
                email_notifications: preferences.notification_settings?.email_notifications ?? existingPrefs.notification_settings.email_notifications,
                push_notifications: preferences.notification_settings?.push_notifications ?? existingPrefs.notification_settings.push_notifications,
            }
        };
        return user_repository_1.default.upsertUserPreferences(newPrefs);
    }
}
exports.UserPreferencesService = UserPreferencesService;
exports.default = new UserPreferencesService();
//# sourceMappingURL=user.service.js.map