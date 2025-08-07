import { FlipModePreferences, UserPreferences } from './user.types';
export declare class UserPreferencesService {
    getFlipModePreferences(userId: string): Promise<FlipModePreferences | null>;
    saveFlipModePreferences(userId: string, preferences: Partial<FlipModePreferences>): Promise<FlipModePreferences>;
    getUserPreferences(userId: string): Promise<UserPreferences>;
    saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>;
}
declare const _default: UserPreferencesService;
export default _default;
//# sourceMappingURL=user.service.d.ts.map