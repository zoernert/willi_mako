export interface M2CRole {
    id: string;
    role_name: string;
    short_description: string;
    detailed_description: string;
    created_at: Date;
    updated_at: Date;
}
export declare class M2CRoleRepository {
    /**
     * Get all M2C roles ordered by name
     */
    findAll(): Promise<M2CRole[]>;
    /**
     * Get M2C roles by their IDs
     */
    findByIds(roleIds: string[]): Promise<M2CRole[]>;
    /**
     * Get a single M2C role by name
     */
    findByName(roleName: string): Promise<M2CRole | null>;
    /**
     * Check if role IDs exist
     */
    validateRoleIds(roleIds: string[]): Promise<boolean>;
}
//# sourceMappingURL=m2cRoleRepository.d.ts.map