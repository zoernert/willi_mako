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
export declare class GamificationService {
    awardBadges(userId: string, context: AwardContext): Promise<Badge | null>;
    private checkIfUserHasBadge;
    private grantBadge;
    getLeaderboard(topic?: string, limit?: number): Promise<any[]>;
    /**
     * Award points when a document is used in AI response
     */
    awardDocumentUsagePoints(documentId: string, chatId: string): Promise<void>;
    /**
     * Get team leaderboard with valid (non-expired) points
     */
    getTeamLeaderboard(teamId: string, limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Clean up expired points (for cron job)
     */
    cleanupExpiredPoints(): Promise<number>;
    /**
     * Get user's current valid points
     */
    getUserValidPoints(userId: string): Promise<number>;
    /**
     * Get user's points history
     */
    getUserPointsHistory(userId: string, limit?: number): Promise<any[]>;
}
export {};
//# sourceMappingURL=gamification.service.d.ts.map