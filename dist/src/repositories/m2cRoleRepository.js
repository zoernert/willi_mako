"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.M2CRoleRepository = void 0;
const database_1 = require("../utils/database");
class M2CRoleRepository {
    /**
     * Get all M2C roles ordered by name
     */
    async findAll() {
        return await database_1.DatabaseHelper.executeQuery(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      ORDER BY role_name
    `);
    }
    /**
     * Get M2C roles by their IDs
     */
    async findByIds(roleIds) {
        if (roleIds.length === 0)
            return [];
        return await database_1.DatabaseHelper.executeQuery(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      WHERE id = ANY($1)
      ORDER BY role_name
    `, [roleIds]);
    }
    /**
     * Get a single M2C role by name
     */
    async findByName(roleName) {
        return await database_1.DatabaseHelper.executeQuerySingle(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      WHERE role_name = $1
    `, [roleName]);
    }
    /**
     * Check if role IDs exist
     */
    async validateRoleIds(roleIds) {
        if (roleIds.length === 0)
            return true;
        const result = await database_1.DatabaseHelper.executeQuerySingle(`
      SELECT COUNT(*) as count
      FROM m2c_roles
      WHERE id = ANY($1)
    `, [roleIds]);
        return (result === null || result === void 0 ? void 0 : result.count) === roleIds.length;
    }
}
exports.M2CRoleRepository = M2CRoleRepository;
//# sourceMappingURL=m2cRoleRepository.js.map