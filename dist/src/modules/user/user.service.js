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
        var _a, _b, _c, _d, _e;
        const existingPrefs = await this.getFlipModePreferences(userId) || { user_id: userId };
        const newPrefs = {
            user_id: userId,
            energy_type: (_a = preferences.energy_type) !== null && _a !== void 0 ? _a : existingPrefs.energy_type,
            stakeholder_perspective: (_b = preferences.stakeholder_perspective) !== null && _b !== void 0 ? _b : existingPrefs.stakeholder_perspective,
            context_specificity: (_c = preferences.context_specificity) !== null && _c !== void 0 ? _c : existingPrefs.context_specificity,
            detail_level: (_d = preferences.detail_level) !== null && _d !== void 0 ? _d : existingPrefs.detail_level,
            topic_focus: (_e = preferences.topic_focus) !== null && _e !== void 0 ? _e : existingPrefs.topic_focus,
        };
        return user_repository_1.default.upsertFlipModePreferences(newPrefs);
    }
    async getUserPreferences(userId) {
        const preferences = await user_repository_1.default.getUserPreferences(userId);
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
    async saveUserPreferences(userId, preferences) {
        var _a, _b, _c, _d, _e, _f;
        const existingPrefs = await this.getUserPreferences(userId);
        const newPrefs = {
            user_id: userId,
            companies_of_interest: (_a = preferences.companies_of_interest) !== null && _a !== void 0 ? _a : existingPrefs.companies_of_interest,
            preferred_topics: (_b = preferences.preferred_topics) !== null && _b !== void 0 ? _b : existingPrefs.preferred_topics,
            notification_settings: {
                email_notifications: (_d = (_c = preferences.notification_settings) === null || _c === void 0 ? void 0 : _c.email_notifications) !== null && _d !== void 0 ? _d : existingPrefs.notification_settings.email_notifications,
                push_notifications: (_f = (_e = preferences.notification_settings) === null || _e === void 0 ? void 0 : _e.push_notifications) !== null && _f !== void 0 ? _f : existingPrefs.notification_settings.push_notifications,
            }
        };
        return user_repository_1.default.upsertUserPreferences(newPrefs);
    }
}
exports.UserPreferencesService = UserPreferencesService;
exports.default = new UserPreferencesService();
//# sourceMappingURL=user.service.js.map