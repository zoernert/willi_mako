import { Pool } from 'pg';
export interface Timeline {
    id: string;
    name: string;
    description?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    metadata?: any;
}
export interface Activity {
    id: string;
    timeline_id: string;
    feature_type: string;
    action_type: string;
    context_data: any;
    ai_summary?: string;
    ai_title?: string;
    created_by: string;
    created_at: Date;
    is_milestone: boolean;
    metadata?: any;
}
export interface ActivityProcessingQueue {
    id: string;
    activity_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retry_count: number;
    error_message?: string;
    created_at: Date;
    processed_at?: Date;
}
export declare class TimelineActivityService {
    private db;
    private llmService;
    constructor(db: Pool);
    /**
     * Zentrale Methode für Timeline-Activity-Capture
     * Erstellt sofort einen Placeholder-Eintrag und startet asynchrone Verarbeitung
     */
    captureActivity(request: {
        timelineId: string;
        feature: string;
        activityType: string;
        rawData: any;
        priority?: number;
    }): Promise<string>;
    createTimeline(name: string, createdBy: string, description?: string, metadata?: any): Promise<Timeline>;
    getTimelinesByUser(userId: string): Promise<Timeline[]>;
    getTimelineById(timelineId: string, userId: string): Promise<Timeline | null>;
    updateTimeline(timelineId: string, userId: string, updates: Partial<Pick<Timeline, 'name' | 'description' | 'metadata'>>): Promise<Timeline | null>;
    deleteTimeline(timelineId: string, userId: string): Promise<boolean>;
    createActivity(timelineId: string, featureType: string, actionType: string, contextData: any, createdBy: string, isMilestone?: boolean, metadata?: any): Promise<Activity>;
    getActivitiesByTimeline(timelineId: string, userId: string, limit?: number, offset?: number): Promise<Activity[]>;
    getActivityById(activityId: string, userId: string): Promise<Activity | null>;
    deleteActivity(activityId: string, userId: string): Promise<boolean>;
    processActivityQueue(): Promise<void>;
    private processActivityForAI;
    private generateAISummary;
    getTimelineStats(timelineId: string, userId: string): Promise<any>;
    getRecentActivities(userId: string, limit?: number): Promise<Activity[]>;
    shareTimeline(timelineId: string, ownerId: string, sharedWithUserId: string, permissions?: 'read' | 'write'): Promise<void>;
    getSharedTimelines(userId: string): Promise<Timeline[]>;
}
//# sourceMappingURL=TimelineActivityService.d.ts.map