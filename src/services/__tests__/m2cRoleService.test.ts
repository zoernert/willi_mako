import { M2CRoleService } from '../m2cRoleService';
import { M2CRoleRepository } from '../../repositories/m2cRoleRepository';
import { DatabaseHelper } from '../../utils/database';

jest.mock('../../repositories/m2cRoleRepository');
jest.mock('../../utils/database');

describe('M2CRoleService', () => {
  let service: M2CRoleService;
  let mockRepository: jest.Mocked<M2CRoleRepository>;

  beforeEach(() => {
    mockRepository = new M2CRoleRepository() as jest.Mocked<M2CRoleRepository>;
    service = new M2CRoleService();
    (service as any).roleRepository = mockRepository;
    process.env.ENABLE_M2C_ROLES = 'true';
  });

  afterEach(() => {
    service.clearCache();
    delete process.env.ENABLE_M2C_ROLES;
  });

  describe('buildUserRoleContext', () => {
    it('should return empty string when feature disabled', async () => {
      process.env.ENABLE_M2C_ROLES = 'false';
      const context = await service.buildUserRoleContext('user-id');
      expect(context).toBe('');
    });

    it('should return empty string when user has no roles', async () => {
      // Mock DatabaseHelper to return empty role IDs
      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue({ selected_m2c_role_ids: [] });
      
      const context = await service.buildUserRoleContext('user-id');
      expect(context).toBe('');
    });

    it('should build proper context for multiple roles', async () => {
      const mockRoles = [
        {
          id: '1',
          role_name: 'Abrechnungsmanager',
          short_description: 'Abrechnung für Endkunden und Marktpartner',
          detailed_description: 'Der Abrechnungsmanager ist eine wirtschaftlich entscheidende Rolle, die für die korrekte und pünktliche Abrechnung der Kunden sowie die Abrechnung zwischen den Marktpartnern verantwortlich ist.',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2', 
          role_name: 'Datenaustauschmanager',
          short_description: 'Technische Integrität der EDIFACT-Kommunikation',
          detailed_description: 'Diese Rolle ist auf die technische Ebene der Marktkommunikation spezialisiert. Der Datenaustauschmanager ist verantwortlich für die technische Integrität, das Monitoring und die regelkonforme Übertragung der Daten zwischen den Marktpartnern.',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      // Mock user having role IDs
      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue({ 
        selected_m2c_role_ids: ['1', '2'] 
      });
      
      mockRepository.findByIds.mockResolvedValue(mockRoles);
      
      const context = await service.buildUserRoleContext('user-id');
      
      expect(context).toContain('Rollen aktiv: Abrechnungsmanager, Datenaustauschmanager');
      expect(context).toContain('Kurzzusammenfassung:');
      expect(context).toContain('- Abrechnungsmanager: Abrechnung für Endkunden und Marktpartner');
      expect(context).toContain('- Datenaustauschmanager: Technische Integrität der EDIFACT-Kommunikation');
      expect(context).toContain('Details:');
      expect(context).toContain('Abrechnungsmanager: Der Abrechnungsmanager ist eine wirtschaftlich');
      expect(context).toContain('Datenaustauschmanager: Diese Rolle ist auf die technische Ebene');
    });

    it('should truncate context if too long', async () => {
      const longDescription = 'a'.repeat(1000);
      const mockRoles = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        role_name: `Role${i + 1}`,
        short_description: `Short${i + 1}`,
        detailed_description: longDescription,
        created_at: new Date(),
        updated_at: new Date()
      }));

      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue({ 
        selected_m2c_role_ids: ['1', '2', '3', '4', '5'] 
      });
      
      mockRepository.findByIds.mockResolvedValue(mockRoles);
      
      const context = await service.buildUserRoleContext('user-id');
      
      expect(context.length).toBeLessThanOrEqual(2500);
      // Should fallback to short descriptions only
      expect(context).toContain('Rollen aktiv: Role1, Role2, Role3, Role4, Role5');
      expect(context).toContain('Role1: Short1');
    });

    it('should sort roles alphabetically for deterministic output', async () => {
      const mockRoles = [
        {
          id: '1',
          role_name: 'Zebra Role',
          short_description: 'Last role',
          detailed_description: 'Last role description',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          role_name: 'Alpha Role',
          short_description: 'First role',
          detailed_description: 'First role description',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue({ 
        selected_m2c_role_ids: ['1', '2'] 
      });
      
      mockRepository.findByIds.mockResolvedValue(mockRoles);
      
      const context = await service.buildUserRoleContext('user-id');
      
      expect(context).toContain('Rollen aktiv: Alpha Role, Zebra Role');
    });
  });

  describe('updateUserRoleSelection', () => {
    it('should reject more than 5 roles', async () => {
      const roleIds = Array.from({ length: 6 }, (_, i) => `550e8400-e29b-41d4-a716-44665544000${i}`);
      
      await expect(service.updateUserRoleSelection('user-id', roleIds))
        .rejects.toThrow('Maximal 5 Rollen können ausgewählt werden');
    });

    it('should reject non-existent roles', async () => {
      const roleIds = ['550e8400-e29b-41d4-a716-446655440000'];
      mockRepository.findByIds.mockResolvedValue([]);
      
      await expect(service.updateUserRoleSelection('user-id', roleIds))
        .rejects.toThrow('Einer oder mehrere der ausgewählten Rollen existieren nicht');
    });

    it('should successfully update valid role selection', async () => {
      const roleIds = ['550e8400-e29b-41d4-a716-446655440000'];
      const mockRoles = [{
        id: '550e8400-e29b-41d4-a716-446655440000',
        role_name: 'Test Role',
        short_description: 'Test Description',
        detailed_description: 'Test Detailed Description',
        created_at: new Date(),
        updated_at: new Date()
      }];
      
      mockRepository.findByIds.mockResolvedValue(mockRoles);
      (DatabaseHelper.executeQuery as jest.Mock).mockResolvedValue({});
      
      await expect(service.updateUserRoleSelection('user-id', roleIds))
        .resolves.toBeUndefined();
      
      expect(DatabaseHelper.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [roleIds, 'user-id']
      );
    });

    it('should remove duplicates from role selection', async () => {
      const roleIds = ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'];
      const mockRoles = [{
        id: '550e8400-e29b-41d4-a716-446655440000',
        role_name: 'Test Role',
        short_description: 'Test Description',
        detailed_description: 'Test Detailed Description',
        created_at: new Date(),
        updated_at: new Date()
      }];
      
      mockRepository.findByIds.mockResolvedValue(mockRoles);
      (DatabaseHelper.executeQuery as jest.Mock).mockResolvedValue({});
      
      await service.updateUserRoleSelection('user-id', roleIds);
      
      expect(DatabaseHelper.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [['550e8400-e29b-41d4-a716-446655440000'], 'user-id']
      );
    });
  });

  describe('getAllRoles', () => {
    it('should cache roles for TTL period', async () => {
      const mockRoles = [{
        id: '1',
        role_name: 'Test Role',
        short_description: 'Test Description',
        detailed_description: 'Test Detailed Description',
        created_at: new Date(),
        updated_at: new Date()
      }];
      
      mockRepository.findAll.mockResolvedValue(mockRoles);
      
      // First call
      const result1 = await service.getAllRoles();
      expect(result1).toEqual(mockRoles);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = await service.getAllRoles();
      expect(result2).toEqual(mockRoles);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      const mockRoles = [{
        id: '1',
        role_name: 'Test Role',
        short_description: 'Test Description',
        detailed_description: 'Test Detailed Description',
        created_at: new Date(),
        updated_at: new Date()
      }];
      
      mockRepository.findAll.mockResolvedValue(mockRoles);
      
      // First call
      await service.getAllRoles();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      
      // Clear cache manually to simulate TTL expiry
      service.clearCache();
      
      // Second call should fetch again
      await service.getAllRoles();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return false when feature flag is disabled', async () => {
      process.env.ENABLE_M2C_ROLES = 'false';
      const context = await service.buildUserRoleContext('user-id');
      expect(context).toBe('');
    });

    it('should return false when feature flag is undefined', async () => {
      delete process.env.ENABLE_M2C_ROLES;
      const context = await service.buildUserRoleContext('user-id');
      expect(context).toBe('');
    });
  });
});
