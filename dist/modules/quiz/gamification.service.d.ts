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
    awardDocumentUsagePoints(documentId: string, chatId: string): Promise<void>;
    getTeamLeaderboard(teamId: string, limit?: number): Promise<LeaderboardEntry[]>;
    cleanupExpiredPoints(): Promise<number>;
    getUserValidPoints(userId: string): Promise<number>;
    getUserPointsHistory(userId: string, limit?: number): Promise<any[]>;
}
export {};
//# sourceMappingURL=gamification.service.d.ts.map