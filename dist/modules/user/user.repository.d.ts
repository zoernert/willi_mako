import { FlipModePreferences, UserPreferences } from './user.types';
export declare class UserPreferencesRepository {
    getFlipModePreferences(userId: string): Promise<FlipModePreferences | null>;
    upsertFlipModePreferences(preferences: FlipModePreferences): Promise<FlipModePreferences>;
    getUserPreferences(userId: string): Promise<UserPreferences | null>;
    upsertUserPreferences(preferences: UserPreferences): Promise<UserPreferences>;
}
declare const _default: UserPreferencesRepository;
export default _default;
//# sourceMappingURL=user.repository.d.ts.map