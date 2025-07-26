import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { teamRoutes } from '../../src/routes/teams';
import pool from '../../src/config/database';
import { generateTestToken, TestUser } from '../helpers/auth';

const app = express();
app.use(express.json());
app.use('/api/teams', teamRoutes);

describe('Teams API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let teamId: string;
  let testUser: TestUser;

  beforeAll(async () => {
    // Generate a proper UUID for the test user
    userId = uuidv4();
    
    // Create a test user and get auth token
    testUser = {
      id: userId,
      email: 'teamtest@example.com',
      firstName: 'Team',
      lastName: 'Tester'
    };
    
    authToken = generateTestToken(testUser);
    
    // Ensure test user exists in database for foreign key constraints
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO users (id, email, name, full_name, password_hash) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (id) DO UPDATE SET 
         email = EXCLUDED.email, 
         name = EXCLUDED.name,
         full_name = EXCLUDED.full_name`,
        [
          userId, 
          testUser.email, 
          `${testUser.firstName} ${testUser.lastName}`, // name column
          `${testUser.firstName} ${testUser.lastName}`, // full_name column
          'test_hash'
        ]
      );
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    // Clean up test data
    const client = await pool.connect();
    try {
      // Clean up in reverse order due to foreign key constraints
      if (teamId) {
        await client.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
        await client.query('DELETE FROM teams WHERE id = $1', [teamId]);
      }
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    } finally {
      client.release();
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
