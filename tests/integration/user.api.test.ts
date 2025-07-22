import request from 'supertest';
import express from 'express';
import userRoutes from '../../src/presentation/http/routes/user.routes';
import { authenticateToken } from '../../src/middleware/auth';
import { DatabaseHelper } from '../../src/utils/database';
import { generateTestToken, TestUser } from '../helpers/auth';

const app = express();
app.use(express.json());
app.use('/api/v2/user', authenticateToken, userRoutes);

describe('User API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    const testUser: TestUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };
    authToken = generateTestToken(testUser);
    userId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    await DatabaseHelper.executeQuery(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );
  });

  describe('GET /api/v2/user/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/v2/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('expertise_level');
      expect(response.body.data).toHaveProperty('communication_style');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/v2/user/profile')
        .expect(401);
    });
  });

  describe('PUT /api/v2/user/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        company: 'Updated Company'
      };

      const response = await request(app)
        .put('/api/v2/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.full_name).toBe('Updated Name');
      expect(response.body.data.company).toBe('Updated Company');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .put('/api/v2/user/profile')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v2/user/preferences', () => {
    it('should return user preferences', async () => {
      const response = await request(app)
        .get('/api/v2/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('companies_of_interest');
      expect(response.body.data).toHaveProperty('preferred_topics');
    });
  });

  describe('PUT /api/v2/user/preferences', () => {
    it('should update user preferences', async () => {
      const preferencesData = {
        companies_of_interest: ['Tech Corp', 'Startup Inc'],
        preferred_topics: ['AI', 'Machine Learning'],
        notification_settings: { email: true }
      };

      const response = await request(app)
        .put('/api/v2/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferencesData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companies_of_interest).toEqual(['Tech Corp', 'Startup Inc']);
      expect(response.body.data.preferred_topics).toEqual(['AI', 'Machine Learning']);
    });
  });
});
