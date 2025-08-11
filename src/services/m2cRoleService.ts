import { M2CRoleRepository, M2CRole } from '../repositories/m2cRoleRepository';
import { DatabaseHelper } from '../utils/database';

const MAX_USER_M2C_ROLES = 5;
const MAX_CONTEXT_LENGTH = 2500;
const MAX_DESCRIPTION_LENGTH = 800;

interface UserRoleSelection {
  roleIds: string[];
  roles: M2CRole[];
}

export class M2CRoleService {
  private roleRepository: M2CRoleRepository;
  private rolesCache: { data: M2CRole[]; loadedAt: number } | null = null;
  private userSelectionCache: Map<string, { ids: string[]; loadedAt: number }> = new Map();
  
  private readonly TTL_ROLES = 10 * 60 * 1000; // 10 minutes
  private readonly TTL_USER = 2 * 60 * 1000; // 2 minutes

  constructor() {
    this.roleRepository = new M2CRoleRepository();
  }

  /**
   * Get all available M2C roles with caching
   */
  async getAllRoles(): Promise<M2CRole[]> {
    const now = Date.now();
    
    if (this.rolesCache && (now - this.rolesCache.loadedAt) < this.TTL_ROLES) {
      return this.rolesCache.data;
    }

    const roles = await this.roleRepository.findAll();
    this.rolesCache = { data: roles, loadedAt: now };
    return roles;
  }

  /**
   * Get user's selected roles with details
   */
  async getUserRoleSelection(userId: string): Promise<UserRoleSelection> {
    const roleIds = await this.getUserSelectedRoleIds(userId);
    const roles = roleIds.length > 0 ? await this.roleRepository.findByIds(roleIds) : [];
    
    return { roleIds, roles };
  }

  /**
   * Update user's role selection with validation
   */
  async updateUserRoleSelection(userId: string, roleIds: string[]): Promise<void> {
    // Validation: Max roles limit
    if (roleIds.length > MAX_USER_M2C_ROLES) {
      throw new Error(`Maximal ${MAX_USER_M2C_ROLES} Rollen können ausgewählt werden`);
    }

    // Remove duplicates
    const uniqueRoleIds = [...new Set(roleIds)];
    
    // Validate UUIDs format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = uniqueRoleIds.filter(id => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      throw new Error('Ungültige Rollen-ID Format entdeckt');
    }

    // Validate role existence
    if (uniqueRoleIds.length > 0) {
      const existingRoles = await this.roleRepository.findByIds(uniqueRoleIds);
      if (existingRoles.length !== uniqueRoleIds.length) {
        throw new Error('Einer oder mehrere der ausgewählten Rollen existieren nicht');
      }
    }

    // Update database
    await DatabaseHelper.executeQuery(`
      UPDATE users 
      SET selected_m2c_role_ids = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [uniqueRoleIds, userId]);

    // Invalidate cache
    this.userSelectionCache.delete(userId);
  }

  /**
   * Build role context string for chat prompts
   */
  async buildUserRoleContext(userId: string): Promise<string> {
    if (!this.isFeatureEnabled()) {
      return '';
    }

    const roleIds = await this.getUserSelectedRoleIds(userId);
    if (roleIds.length === 0) {
      return '';
    }

    const roles = await this.roleRepository.findByIds(roleIds);
    if (roles.length === 0) {
      return '';
    }

    // Sort roles alphabetically for deterministic output
    roles.sort((a, b) => a.role_name.localeCompare(b.role_name));

    let context = `Rollen aktiv: ${roles.map(r => r.role_name).join(', ')}\n\n`;
    context += 'Kurzzusammenfassung:\n';
    roles.forEach(role => {
      context += `- ${role.role_name}: ${role.short_description}\n`;
    });
    context += '\nDetails:\n';

    // Add detailed descriptions with length management
    for (const role of roles) {
      let description = role.detailed_description;
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        // Find last word boundary before limit
        const truncated = description.substring(0, MAX_DESCRIPTION_LENGTH);
        const lastSpace = truncated.lastIndexOf(' ');
        description = truncated.substring(0, lastSpace) + '...';
      }
      context += `${role.role_name}: ${description}\n---\n`;
    }

    // Final length check - if still too long, fallback to short descriptions only
    if (context.length > MAX_CONTEXT_LENGTH) {
      context = `Rollen aktiv: ${roles.map(r => r.role_name).join(', ')}\n\n`;
      roles.forEach(role => {
        context += `${role.role_name}: ${role.short_description}\n`;
      });
    }

    return context;
  }

  /**
   * Get user's selected role IDs with caching
   */
  private async getUserSelectedRoleIds(userId: string): Promise<string[]> {
    const now = Date.now();
    const cached = this.userSelectionCache.get(userId);
    
    if (cached && (now - cached.loadedAt) < this.TTL_USER) {
      return cached.ids;
    }

    const result = await DatabaseHelper.executeQuerySingle<{ selected_m2c_role_ids: string[] }>(`
      SELECT selected_m2c_role_ids FROM users WHERE id = $1
    `, [userId]);

    const roleIds = result?.selected_m2c_role_ids || [];
    this.userSelectionCache.set(userId, { ids: roleIds, loadedAt: now });
    
    return roleIds;
  }

  /**
   * Check if M2C roles feature is enabled
   */
  private isFeatureEnabled(): boolean {
    return process.env.ENABLE_M2C_ROLES === 'true';
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    this.rolesCache = null;
    this.userSelectionCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      rolesCache: {
        hasData: !!this.rolesCache,
        age: this.rolesCache ? Date.now() - this.rolesCache.loadedAt : 0
      },
      userSelectionCache: {
        size: this.userSelectionCache.size
      },
      featureEnabled: this.isFeatureEnabled()
    };
  }

  /**
   * Get detailed role context information for analytics/debugging
   */
  async getUserRoleContextDetails(userId: string): Promise<{
    featureEnabled: boolean;
    userHasRoles: boolean;
    selectedRoleIds: string[];
    selectedRoles: M2CRole[];
    contextGenerated: string;
    contextLength: number;
    contextTruncated: boolean;
    cacheHit: boolean;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const featureEnabled = this.isFeatureEnabled();
    
    if (!featureEnabled) {
      return {
        featureEnabled: false,
        userHasRoles: false,
        selectedRoleIds: [],
        selectedRoles: [],
        contextGenerated: '',
        contextLength: 0,
        contextTruncated: false,
        cacheHit: false,
        processingTime: Date.now() - startTime
      };
    }

    const cacheHit = this.userSelectionCache.has(userId);
    const roleIds = await this.getUserSelectedRoleIds(userId);
    const roles = roleIds.length > 0 ? await this.roleRepository.findByIds(roleIds) : [];
    const context = await this.buildUserRoleContext(userId);
    
    return {
      featureEnabled: true,
      userHasRoles: roleIds.length > 0,
      selectedRoleIds: roleIds,
      selectedRoles: roles,
      contextGenerated: context,
      contextLength: context.length,
      contextTruncated: context.endsWith('...'),
      cacheHit,
      processingTime: Date.now() - startTime
    };
  }
}

export default new M2CRoleService();
