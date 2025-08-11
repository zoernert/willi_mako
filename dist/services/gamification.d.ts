import { Pool } from 'pg';
import { UserPoints, UserExpertise, LeaderboardEntry, Achievement, ExpertiseUpdate } from '../types/quiz';
export declare class GamificationService {
    private db;
    constructor(db: Pool);
    awardPoints(userId: string, points: number, sourceType: string, sourceId: string): Promise<number>;
    updateExpertiseLevel(userId: string, topicArea: string): Promise<ExpertiseUpdate[]>;
    updateLeaderboard(userId: string, client?: any): Promise<void>;
    checkAchievements(userId: string): Promise<Achievement[]>;
    getLeaderboard(limit?: number, timeframe?: 'week' | 'month' | 'all'): Promise<LeaderboardEntry[]>;
    getUserPoints(userId: string): Promise<UserPoints[]>;
    getUserExpertise(userId: string): Promise<UserExpertise[]>;
    updateLeaderboardSettings(userId: string, isVisible: boolean): Promise<void>;
    private calculateExpertiseLevel;
    private getPointsDescription;
}
//# sourceMappingURL=gamification.d.ts.map