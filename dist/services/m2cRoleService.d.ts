import { M2CRole } from '../repositories/m2cRoleRepository';
interface UserRoleSelection {
    roleIds: string[];
    roles: M2CRole[];
}
export declare class M2CRoleService {
    private roleRepository;
    private rolesCache;
    private userSelectionCache;
    private readonly TTL_ROLES;
    private readonly TTL_USER;
    constructor();
    /**
     * Get all available M2C roles with caching
     */
    getAllRoles(): Promise<M2CRole[]>;
    /**
     * Get user's selected roles with details
     */
    getUserRoleSelection(userId: string): Promise<UserRoleSelection>;
    /**
     * Update user's role selection with validation
     */
    updateUserRoleSelection(userId: string, roleIds: string[]): Promise<void>;
    /**
     * Build role context string for chat prompts
     */
    buildUserRoleContext(userId: string): Promise<string>;
    /**
     * Get user's selected role IDs with caching
     */
    private getUserSelectedRoleIds;
    /**
     * Check if M2C roles feature is enabled
     */
    private isFeatureEnabled;
    /**
     * Clear all caches (useful for testing)
     */
    clearCache(): void;
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats(): {
        rolesCache: {
            hasData: boolean;
            age: number;
        };
        userSelectionCache: {
            size: number;
        };
        featureEnabled: boolean;
    };
    /**
     * Get detailed role context information for analytics/debugging
     */
    getUserRoleContextDetails(userId: string): Promise<{
        featureEnabled: boolean;
        userHasRoles: boolean;
        selectedRoleIds: string[];
        selectedRoles: M2CRole[];
        contextGenerated: string;
        contextLength: number;
        contextTruncated: boolean;
        cacheHit: boolean;
        processingTime: number;
    }>;
}
declare const _default: M2CRoleService;
export default _default;
//# sourceMappingURL=m2cRoleService.d.ts.map