import { DatabaseHelper } from '../src/utils/database';
import * as fs from 'fs';
import * as path from 'path';

const seedRoles = async () => {
  try {
    console.log('Starting M2C roles seeding...');
    
    const rolesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/m2c_roles.seed.json'), 'utf8')
    );

    console.log(`Found ${rolesData.length} roles to seed`);

    for (const role of rolesData) {
      console.log(`Seeding role: ${role.role_name}`);
      
      await DatabaseHelper.executeQuery(`
        INSERT INTO m2c_roles (role_name, short_description, detailed_description)
        VALUES ($1, $2, $3)
        ON CONFLICT (role_name) DO UPDATE SET
          short_description = EXCLUDED.short_description,
          detailed_description = EXCLUDED.detailed_description,
          updated_at = CURRENT_TIMESTAMP
      `, [role.role_name, role.short_description, role.detailed_description]);
    }

    console.log('M2C roles seeded successfully');
    
    // Verify seeding
    const count = await DatabaseHelper.executeQuerySingle<{ count: number }>(`
      SELECT COUNT(*) as count FROM m2c_roles
    `);
    
    console.log(`Total M2C roles in database: ${count?.count || 0}`);
    
  } catch (error) {
    console.error('Error seeding M2C roles:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  seedRoles();
}

export { seedRoles };
