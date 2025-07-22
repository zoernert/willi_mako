import request from 'supertest';
import express from 'express';
import quizRoutes from '../../src/presentation/http/routes/quiz.routes';
import { authenticateToken } from '../../src/middleware/auth';
import { DatabaseHelper } from '../../src/utils/database';
import { generateTestToken, TestUser } from '../helpers/auth';

const app = express();
app.use(express.json());
app.use('/api/v2/quiz', authenticateToken, quizRoutes);

describe('Quiz API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let quizId: string;

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
    if (quizId) {
      await DatabaseHelper.executeQuery(
        'DELETE FROM quizzes WHERE id = $1',
        [quizId]
      );
    }
  });

  describe('POST /api/v2/quiz', () => {
    it('should create a new quiz', async () => {
      const quizData = {
        title: 'Integration Test Quiz',
        description: 'A quiz created during integration testing',
        difficulty_level: 'medium',
        topic_area: 'testing',
        time_limit_minutes: 30,
        question_count: 5
      };

      const response = await request(app)
        .post('/api/v2/quiz')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quizData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(quizData.title);
      expect(response.body.data.difficulty_level).toBe(quizData.difficulty_level);
      
      quizId = response.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/v2/quiz')
        .send({ title: 'Test Quiz' })
        .expect(401);
    });
  });

  describe('GET /api/v2/quiz/:id', () => {
    it('should return a quiz by id', async () => {
      if (!quizId) {
        throw new Error('Quiz ID not available for test');
      }

      const response = await request(app)
        .get(`/api/v2/quiz/${quizId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(quizId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('questions');
    });

    it('should return 404 for non-existent quiz', async () => {
      await request(app)
        .get('/api/v2/quiz/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v2/quiz', () => {
    it('should return user quizzes', async () => {
      const response = await request(app)
        .get('/api/v2/quiz')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/v2/quiz')
        .expect(401);
    });
  });

  describe('GET /api/v2/quiz/user/stats', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/v2/quiz/user/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_quizzes');
      expect(response.body.data).toHaveProperty('completed_quizzes');
    });
  });
});
