import { DatabaseHelper } from '../../utils/database';
import { AppError } from '../../utils/errors';

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
}
