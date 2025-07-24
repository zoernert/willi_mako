import request from 'supertest';
import express from 'express';
import { teamRoutes } from '../../src/routes/teams';
import { authenticateToken } from '../../src/middleware/auth';
import pool from '../../src/config/database';

const app = express();
app.use(express.json());
app.use('/api/teams', teamRoutes);

describe('Teams API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
      });

    if (userResponse.status === 201) {
      authToken = userResponse.body.token;
      userId = userResponse.body.user.id;
    } else {
      // User might already exist, try login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        });
      
      authToken = loginResponse.body.token;
      userId = loginResponse.body.user.id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (teamId) {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
        await client.query('DELETE FROM teams WHERE id = $1', [teamId]);
      } finally {
        client.release();
      }
    }
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Team',
          description: 'A team for testing',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test Team');
      expect(response.body.data.description).toBe('A team for testing');
      
      teamId = response.body.data.id;
    });

    it('should not allow creating team if user already in team', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Another Team',
          description: 'Should fail',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already in a team');
    });
  });

  describe('GET /api/teams/my-team', () => {
    it('should return user\'s team with members', async () => {
      const response = await request(app)
        .get('/api/teams/my-team')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', teamId);
      expect(response.body.data).toHaveProperty('members');
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data.members[0].role).toBe('admin');
    });
  });

  describe('GET /api/teams', () => {
    it('should return list of all teams', async () => {
      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/teams/leaderboard', () => {
    it('should return team leaderboard', async () => {
      const response = await request(app)
        .get('/api/teams/leaderboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('user_id');
      expect(response.body.data[0]).toHaveProperty('user_name');
      expect(response.body.data[0]).toHaveProperty('total_points');
      expect(response.body.data[0]).toHaveProperty('rank');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for team routes', async () => {
      const response = await request(app)
        .get('/api/teams/my-team');

      expect(response.status).toBe(401);
    });
  });
});
