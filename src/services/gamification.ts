import { Pool } from 'pg';
import { UserPoints, UserExpertise, LeaderboardEntry, Achievement, ExpertiseUpdate } from '../modules/quiz/quiz.interface';

export class GamificationService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async awardPoints(userId: string, points: number, sourceType: string, sourceId: string): Promise<number> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Insert points record
      const pointsQuery = `
        INSERT INTO user_points (user_id, points, source_type, source_id, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const description = this.getPointsDescription(sourceType, points);
      await client.query(pointsQuery, [userId, points, sourceType, sourceId, description]);
      
      // Update leaderboard
      await this.updateLeaderboard(userId, client);
      
      await client.query('COMMIT');
      return points;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateExpertiseLevel(userId: string, topicArea: string): Promise<ExpertiseUpdate[]> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Get current expertise
      const currentQuery = `
        SELECT * FROM user_expertise
        WHERE user_id = $1 AND topic_area = $2
      `;
      const currentResult = await client.query(currentQuery, [userId, topicArea]);
      
      // Get total points in topic
      const pointsQuery = `
        SELECT COALESCE(SUM(up.points), 0) as total_points
        FROM user_points up
        JOIN user_quiz_attempts uqa ON up.source_id = uqa.id
        JOIN quizzes q ON uqa.quiz_id = q.id
        WHERE up.user_id = $1 AND up.source_type = 'quiz' AND q.topic_area = $2
      `;
      const pointsResult = await client.query(pointsQuery, [userId, topicArea]);
      const totalPoints = parseInt(pointsResult.rows[0].total_points);
      
      const newLevel = this.calculateExpertiseLevel(totalPoints);
      const updates: ExpertiseUpdate[] = [];
      
      if (currentResult.rows.length === 0) {
        // Create new expertise record
        const insertQuery = `
          INSERT INTO user_expertise (user_id, topic_area, expertise_level, points_in_topic)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(insertQuery, [userId, topicArea, newLevel, totalPoints]);
        
        updates.push({
          topic_area: topicArea,
          old_level: 'beginner',
          new_level: newLevel,
          points_earned: totalPoints
        });
      } else {
        const currentExpertise = currentResult.rows[0];
        const oldLevel = currentExpertise.expertise_level;
        
        if (oldLevel !== newLevel) {
          // Update expertise level
          const updateQuery = `
            UPDATE user_expertise
            SET expertise_level = $1, points_in_topic = $2, achieved_at = CURRENT_TIMESTAMP
            WHERE user_id = $3 AND topic_area = $4
          `;
          await client.query(updateQuery, [newLevel, totalPoints, userId, topicArea]);
          
          updates.push({
            topic_area: topicArea,
            old_level: oldLevel,
            new_level: newLevel,
            points_earned: totalPoints - currentExpertise.points_in_topic
          });
        }
      }
      
      await client.query('COMMIT');
      return updates;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLeaderboard(userId: string, client?: any): Promise<void> {
    const dbClient = client || this.db;
    
    // Get user's display name
    const userQuery = `
      SELECT full_name FROM users WHERE id = $1
    `;
    const userResult = await dbClient.query(userQuery, [userId]);
    const user = userResult.rows[0];
    const displayName = user ? user.full_name : 'Anonymer Benutzer';
    
    // Calculate totals
    const statsQuery = `
      SELECT 
        COALESCE(SUM(up.points), 0) as total_points,
        COUNT(DISTINCT uqa.id) as quiz_count,
        COALESCE(AVG(uqa.percentage), 0) as avg_score
      FROM user_points up
      LEFT JOIN user_quiz_attempts uqa ON up.source_id = uqa.id AND up.source_type = 'quiz'
      WHERE up.user_id = $1
    `;
    const statsResult = await dbClient.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];
    
    // Upsert leaderboard entry
    const upsertQuery = `
      INSERT INTO leaderboard (user_id, display_name, total_points, quiz_count, average_score, last_activity)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        total_points = EXCLUDED.total_points,
        quiz_count = EXCLUDED.quiz_count,
        average_score = EXCLUDED.average_score,
        last_activity = EXCLUDED.last_activity
    `;
    
    await dbClient.query(upsertQuery, [
      userId,
      displayName,
      stats.total_points,
      stats.quiz_count,
      stats.avg_score
    ]);
  }

  async checkAchievements(userId: string): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    
    // Get user stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT uqa.id) as total_quizzes,
        MAX(uqa.percentage) as best_score,
        COUNT(DISTINCT CASE WHEN uqa.percentage = 100 THEN uqa.id END) as perfect_scores,
        COALESCE(SUM(up.points), 0) as total_points
      FROM user_quiz_attempts uqa
      LEFT JOIN user_points up ON up.source_id = uqa.id AND up.source_type = 'quiz'
      WHERE uqa.user_id = $1 AND uqa.is_completed = true
    `;
    
    const statsResult = await this.db.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];
    
    // Check for achievements
    if (stats.total_quizzes >= 10) {
      achievements.push({
        id: 'quiz_master_10',
        title: 'Quiz-Meister',
        description: '10 Quizzes erfolgreich abgeschlossen',
        type: 'quiz_master',
        user_id: userId,
        earned_at: new Date(),
        is_visible: true
      });
    }
    
    if (stats.perfect_scores >= 5) {
      achievements.push({
        id: 'perfect_streak_5',
        title: 'Perfektionist',
        description: '5 Quizzes mit 100% Punktzahl',
        type: 'streak',
        user_id: userId,
        earned_at: new Date(),
        is_visible: true
      });
    }
    
    if (stats.total_points >= 1000) {
      achievements.push({
        id: 'points_1000',
        title: 'Punkte-Sammler',
        description: '1000 Punkte gesammelt',
        type: 'points_milestone',
        user_id: userId,
        earned_at: new Date(),
        is_visible: true
      });
    }
    
    return achievements;
  }

  async getLeaderboard(limit: number = 10, timeframe: 'week' | 'month' | 'all' = 'all'): Promise<LeaderboardEntry[]> {
    let query = `
      SELECT l.*, u.full_name
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      WHERE l.is_visible = true
    `;
    
    const params: any[] = [];
    
    if (timeframe === 'week') {
      query += ` AND l.last_activity > CURRENT_TIMESTAMP - INTERVAL '7 days'`;
    } else if (timeframe === 'month') {
      query += ` AND l.last_activity > CURRENT_TIMESTAMP - INTERVAL '30 days'`;
    }
    
    query += ` ORDER BY l.total_points DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getUserPoints(userId: string): Promise<UserPoints[]> {
    const query = `
      SELECT * FROM user_points
      WHERE user_id = $1
      ORDER BY earned_at DESC
      LIMIT 50
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async getUserExpertise(userId: string): Promise<UserExpertise[]> {
    const query = `
      SELECT * FROM user_expertise
      WHERE user_id = $1
      ORDER BY points_in_topic DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async updateLeaderboardSettings(userId: string, isVisible: boolean): Promise<void> {
    const query = `
      UPDATE leaderboard
      SET is_visible = $1
      WHERE user_id = $2
    `;
    
    await this.db.query(query, [isVisible, userId]);
  }

  private calculateExpertiseLevel(points: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (points >= 1000) return 'expert';
    if (points >= 500) return 'advanced';
    if (points >= 200) return 'intermediate';
    return 'beginner';
  }

  private getPointsDescription(sourceType: string, points: number): string {
    switch (sourceType) {
      case 'quiz':
        return `${points} Punkte für Quiz-Teilnahme`;
      case 'chat':
        return `${points} Punkte für Chat-Aktivität`;
      case 'faq_creation':
        return `${points} Punkte für FAQ-Erstellung`;
      case 'daily_login':
        return `${points} Punkte für täglichen Login`;
      case 'streak':
        return `${points} Punkte für Aktivitäts-Serie`;
      default:
        return `${points} Punkte erhalten`;
    }
  }
}
