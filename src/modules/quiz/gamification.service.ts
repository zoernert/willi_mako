import { DatabaseHelper } from '../../utils/database';
import { AppError } from '../../utils/errors';
import pool from '../../config/database';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon_url: string;
}

interface AwardContext {
    quizId: string;
    score: number;
    topic: string;
}

interface LeaderboardEntry {
    user_id: string;
    user_name: string;
    total_points: number;
    rank: number;
}

export class GamificationService {
    
    async awardBadges(userId: string, context: AwardContext): Promise<Badge | null> {
        // Example: Award a "Topic Master" badge for scoring > 90%
        if (context.score > 90) {
            const badgeName = `${context.topic} Master`;
            const existingBadge = await this.checkIfUserHasBadge(userId, badgeName);
            if (!existingBadge) {
                return this.grantBadge(userId, badgeName, `Achieved over 90% in a ${context.topic} quiz.`);
            }
        }
        // Other badge logic can be added here
        return null;
    }

    private async checkIfUserHasBadge(userId: string, badgeName: string): Promise<boolean> {
        const query = `
            SELECT 1 FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = $1 AND b.name = $2
        `;
        const result = await DatabaseHelper.executeQuerySingle(query, [userId, badgeName]);
        return !!result;
    }

    private async grantBadge(userId: string, badgeName: string, description: string): Promise<Badge | null> {
        // First, find or create the badge
        let badge = await DatabaseHelper.executeQuerySingle<Badge>('SELECT * FROM badges WHERE name = $1', [badgeName]);
        if (!badge) {
            badge = await DatabaseHelper.executeQuerySingle<Badge>(
                'INSERT INTO badges (name, description, icon_url) VALUES ($1, $2, $3) RETURNING *',
                [badgeName, description, 'default_icon.png']
            );
        }

        if (badge) {
            // Grant the badge to the user
            await DatabaseHelper.executeQuery(
                'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)',
                [userId, badge.id]
            );
            return badge;
        }
        return null;
    }

    async getLeaderboard(topic?: string, limit: number = 10): Promise<any[]> {
        let query = `
            SELECT u.id as user_id, u.full_name, SUM(uqa.score) as total_score
            FROM users u
            JOIN user_quiz_attempts uqa ON u.id = uqa.user_id
        `;
        const params: any[] = [];

        if (topic) {
            query += `
                JOIN quizzes q ON uqa.quiz_id = q.id
                WHERE q.topic_area = $1
            `;
            params.push(topic);
        }

        query += `
            GROUP BY u.id
            ORDER BY total_score DESC
            LIMIT $${params.length + 1}
        `;
        params.push(limit);

        return DatabaseHelper.executeQuery(query, params);
    }

    /**
     * Award points when a document is used in AI response
     */
    async awardDocumentUsagePoints(documentId: string, chatId: string): Promise<void> {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Find document uploader - fallback to user_id if uploaded_by_user_id is null
            // Also check if document is processed to avoid awarding points for incomplete uploads
            const documentResult = await client.query(
                'SELECT COALESCE(uploaded_by_user_id, user_id) as uploader_id, is_processed FROM user_documents WHERE id = $1',
                [documentId]
            );
            
            if (documentResult.rows.length === 0) {
                console.warn(`Document with ID ${documentId} not found when awarding usage points`);
                throw new AppError(`Document not found: ${documentId}`, 404);
            }
            
            const uploaderUserId = documentResult.rows[0].uploader_id;
            const isProcessed = documentResult.rows[0].is_processed;
            
            if (!uploaderUserId) {
                console.warn(`Document ${documentId} has no uploader ID, skipping points award`);
                await client.query('ROLLBACK');
                return;
            }
            
            if (!isProcessed) {
                console.warn(`Document ${documentId} is not processed, skipping points award`);
                await client.query('ROLLBACK');
                return;
            }
            
            // Check if points already awarded for this usage
            const existingUsage = await client.query(
                'SELECT 1 FROM document_usage_points WHERE document_id = $1 AND used_in_chat_id = $2',
                [documentId, chatId]
            );
            
            if (existingUsage.rows.length > 0) {
                // Points already awarded for this usage
                await client.query('ROLLBACK');
                return;
            }
            
            // Record document usage
            await client.query(
                `INSERT INTO document_usage_points (document_id, uploader_user_id, used_in_chat_id, points_awarded)
                 VALUES ($1, $2, $3, 1)`,
                [documentId, uploaderUserId, chatId]
            );
            
            // Award 1 point to uploader with 30-day expiry
            await client.query(
                `INSERT INTO user_points (user_id, points, source_type, description, expires_at)
                 VALUES ($1, 1, 'document_usage', 'Document used in AI response', CURRENT_TIMESTAMP + INTERVAL '30 days')`,
                [uploaderUserId]
            );
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get team leaderboard with valid (non-expired) points
     */
    async getTeamLeaderboard(teamId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                `SELECT u.id as user_id, u.full_name as user_name, 
                        COALESCE(SUM(up.points), 0) as total_points,
                        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(up.points), 0) DESC) as rank
                 FROM team_members tm
                 JOIN users u ON tm.user_id = u.id
                 LEFT JOIN user_points up ON u.id = up.user_id 
                     AND up.expires_at > CURRENT_TIMESTAMP
                 WHERE tm.team_id = $1
                 GROUP BY u.id, u.full_name
                 ORDER BY total_points DESC
                 LIMIT $2`,
                [teamId, limit]
            );
            
            return result.rows;
            
        } finally {
            client.release();
        }
    }

    /**
     * Clean up expired points (for cron job)
     */
    async cleanupExpiredPoints(): Promise<number> {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'DELETE FROM user_points WHERE expires_at < CURRENT_TIMESTAMP'
            );
            
            return result.rowCount || 0;
            
        } finally {
            client.release();
        }
    }

    /**
     * Get user's current valid points
     */
    async getUserValidPoints(userId: string): Promise<number> {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'SELECT COALESCE(SUM(points), 0) as total_points FROM user_points WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP',
                [userId]
            );
            
            return parseInt(result.rows[0].total_points) || 0;
            
        } finally {
            client.release();
        }
    }

    /**
     * Get user's points history
     */
    async getUserPointsHistory(userId: string, limit: number = 50): Promise<any[]> {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                `SELECT points, source_type, description, earned_at, expires_at,
                        CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 'active' ELSE 'expired' END as status
                 FROM user_points 
                 WHERE user_id = $1 
                 ORDER BY earned_at DESC 
                 LIMIT $2`,
                [userId, limit]
            );
            
            return result.rows;
            
        } finally {
            client.release();
        }
    }
}
