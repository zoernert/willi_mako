import { DatabaseHelper } from '../utils/database';

export interface M2CRole {
  id: string;
  role_name: string;
  short_description: string;
  detailed_description: string;
  created_at: Date;
  updated_at: Date;
}

export class M2CRoleRepository {
  /**
   * Get all M2C roles ordered by name
   */
  async findAll(): Promise<M2CRole[]> {
    return await DatabaseHelper.executeQuery<M2CRole>(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      ORDER BY role_name
    `);
  }

  /**
   * Get M2C roles by their IDs
   */
  async findByIds(roleIds: string[]): Promise<M2CRole[]> {
    if (roleIds.length === 0) return [];
    
    return await DatabaseHelper.executeQuery<M2CRole>(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      WHERE id = ANY($1)
      ORDER BY role_name
    `, [roleIds]);
  }

  /**
   * Get a single M2C role by name
   */
  async findByName(roleName: string): Promise<M2CRole | null> {
    return await DatabaseHelper.executeQuerySingle<M2CRole>(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      WHERE role_name = $1
    `, [roleName]);
  }

  /**
   * Check if role IDs exist
   */
  async validateRoleIds(roleIds: string[]): Promise<boolean> {
    if (roleIds.length === 0) return true;
    
    const result = await DatabaseHelper.executeQuerySingle<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM m2c_roles
      WHERE id = ANY($1)
    `, [roleIds]);
    
    return result?.count === roleIds.length;
  }
}
