"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const database_1 = require("../../utils/database");
const m2cRoles_1 = __importDefault(require("../m2cRoles"));
const auth_1 = require("../../middleware/auth");
// Mock database and auth middleware
jest.mock('../../utils/database');
jest.mock('../../middleware/auth');
describe('M2C Roles API Integration', () => {
    let app;
    const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
    const mockUser = { id: mockUserId, email: 'test@example.com', role: 'user' };
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        // Mock authentication middleware
        auth_1.authenticateToken.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        app.use('/api', m2cRoles_1.default);
        process.env.ENABLE_M2C_ROLES = 'true';
    });
    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.ENABLE_M2C_ROLES;
    });
    describe('GET /api/m2c-roles', () => {
        it('should return all M2C roles when feature is enabled', async () => {
            const mockRoles = [
                {
                    id: '1',
                    role_name: 'Abrechnungsmanager',
                    short_description: 'Korrekte Abrechnung für Endkunden und Marktpartner',
                    detailed_description: 'Der Abrechnungsmanager ist eine wirtschaftlich entscheidende Rolle...',
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: '2',
                    role_name: 'Datenaustauschmanager',
                    short_description: 'Technische Integrität & Monitoring der EDIFACT-Kommunikation',
                    detailed_description: 'Diese Rolle ist auf die technische Ebene der Marktkommunikation spezialisiert...',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
            database_1.DatabaseHelper.executeQuery.mockResolvedValue(mockRoles);
            const response = await (0, supertest_1.default)(app)
                .get('/api/m2c-roles')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data).toHaveLength(2);
            const role = response.body.data[0];
            expect(role).toHaveProperty('id');
            expect(role).toHaveProperty('role_name');
            expect(role).toHaveProperty('short_description');
            expect(role).not.toHaveProperty('detailed_description'); // Should not expose detailed in list
        });
        it('should return 404 when feature is disabled', async () => {
            process.env.ENABLE_M2C_ROLES = 'false';
            const response = await (0, supertest_1.default)(app)
                .get('/api/m2c-roles')
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('M2C Rollen Feature ist nicht aktiviert');
        });
        it('should require authentication', async () => {
            auth_1.authenticateToken.mockImplementation((req, res, next) => {
                res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            });
            await (0, supertest_1.default)(app)
                .get('/api/m2c-roles')
                .expect(401);
        });
    });
    describe('GET /api/users/me/m2c-roles', () => {
        it('should return user role selection', async () => {
            const mockUserRoles = {
                selected_m2c_role_ids: ['1', '2']
            };
            const mockRoles = [
                {
                    id: '1',
                    role_name: 'Abrechnungsmanager',
                    short_description: 'Korrekte Abrechnung für Endkunden und Marktpartner'
                },
                {
                    id: '2',
                    role_name: 'Datenaustauschmanager',
                    short_description: 'Technische Integrität & Monitoring der EDIFACT-Kommunikation'
                }
            ];
            database_1.DatabaseHelper.executeQuerySingle.mockResolvedValue(mockUserRoles);
            database_1.DatabaseHelper.executeQuery.mockResolvedValue(mockRoles);
            const response = await (0, supertest_1.default)(app)
                .get('/api/users/me/m2c-roles')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.roleIds).toEqual(['1', '2']);
            expect(response.body.data.roles).toHaveLength(2);
            expect(response.body.data.roles[0]).toHaveProperty('role_name');
        });
        it('should return empty selection for user with no roles', async () => {
            database_1.DatabaseHelper.executeQuerySingle.mockResolvedValue({ selected_m2c_role_ids: [] });
            const response = await (0, supertest_1.default)(app)
                .get('/api/users/me/m2c-roles')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.roleIds).toEqual([]);
            expect(response.body.data.roles).toEqual([]);
        });
        it('should return 404 when feature is disabled', async () => {
            process.env.ENABLE_M2C_ROLES = 'false';
            await (0, supertest_1.default)(app)
                .get('/api/users/me/m2c-roles')
                .expect(404);
        });
    });
    describe('PUT /api/users/me/m2c-roles', () => {
        it('should update user role selection successfully', async () => {
            const roleIds = ['1', '2'];
            const mockRoles = [
                { id: '1', role_name: 'Role 1' },
                { id: '2', role_name: 'Role 2' }
            ];
            database_1.DatabaseHelper.executeQuery
                .mockResolvedValueOnce(mockRoles) // findByIds call
                .mockResolvedValueOnce({}); // update call
            const response = await (0, supertest_1.default)(app)
                .put('/api/users/me/m2c-roles')
                .send({ roleIds })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.roleIds).toEqual(roleIds);
            expect(database_1.DatabaseHelper.executeQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), [roleIds, mockUserId]);
        });
        it('should reject invalid role IDs format', async () => {
            await (0, supertest_1.default)(app)
                .put('/api/users/me/m2c-roles')
                .send({ roleIds: ['invalid-uuid'] })
                .expect(400);
        });
        it('should reject non-array roleIds', async () => {
            await (0, supertest_1.default)(app)
                .put('/api/users/me/m2c-roles')
                .send({ roleIds: 'not-an-array' })
                .expect(400);
        });
        it('should reject more than 5 roles', async () => {
            const roleIds = Array.from({ length: 6 }, (_, i) => `550e8400-e29b-41d4-a716-44665544000${i}`);
            await (0, supertest_1.default)(app)
                .put('/api/users/me/m2c-roles')
                .send({ roleIds })
                .expect(400);
        });
        it('should reject non-existent role IDs', async () => {
            const roleIds = ['550e8400-e29b-41d4-a716-446655440000'];
            database_1.DatabaseHelper.executeQuery.mockResolvedValue([]); // No roles found
            await (0, supertest_1.default)(app)
                .put('/api/users/me/m2c-roles')
                .send({ roleIds })
                .expect(400);
        });
        it('should handle empty role selection', async () => {
            database_1.DatabaseHelper.executeQuery.mockResolvedValue({});
            const response = await (0, supertest_1.default)(app)
                .put('/api/users/me/m2c-roles')
                .send({ roleIds: [] })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.roleIds).toEqual([]);
        });
        it('should return 404 when feature is disabled', async () => {
            process.env.ENABLE_M2C_ROLES = 'false';
            await (0, supertest_1.default)(app)
                .put('/api/users/me/m2c-roles')
                .send({ roleIds: [] })
                .expect(404);
        });
    });
    describe('Error handling', () => {
        it('should handle database errors gracefully', async () => {
            database_1.DatabaseHelper.executeQuery.mockRejectedValue(new Error('Database connection failed'));
            const response = await (0, supertest_1.default)(app)
                .get('/api/m2c-roles')
                .expect(500);
            expect(response.body.success).toBe(false);
        });
        it('should validate UUID format strictly', async () => {
            const invalidUuids = [
                'not-a-uuid',
                '123',
                '550e8400-e29b-41d4-a716',
                '550e8400-e29b-41d4-a716-44665544000g', // invalid character
                '' // empty string
            ];
            for (const invalidUuid of invalidUuids) {
                await (0, supertest_1.default)(app)
                    .put('/api/users/me/m2c-roles')
                    .send({ roleIds: [invalidUuid] })
                    .expect(400);
            }
        });
    });
});
//# sourceMappingURL=m2cRoles.integration.test.js.map