import { Pool } from 'pg';
// Use central LLM service instead of direct Gemini integration
const llmDataExtractionService = require('./llmDataExtractionService.js');

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

export class TimelineActivityService {
  private llmService: any;

  constructor(private db: Pool) {
    this.llmService = llmDataExtractionService(); // Verwenden des Singleton
  }

  /**
   * Zentrale Methode für Timeline-Activity-Capture
   * Erstellt sofort einen Placeholder-Eintrag und startet asynchrone Verarbeitung
   */
  async captureActivity(request: {
    timelineId: string;
    feature: string;
    activityType: string;
    rawData: any;
    priority?: number;
  }): Promise<string> {
    try {
      // Erstelle sofortigen Placeholder-Eintrag
      const activityResult = await this.db.query(
        `INSERT INTO timeline_activities 
         (timeline_id, feature_name, activity_type, title, content, metadata, processing_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          request.timelineId,
          request.feature,
          request.activityType,
          `${request.feature} - Wird verarbeitet...`,
          'Die Aktivität wird gerade von der KI analysiert...',
          JSON.stringify(request.rawData),
          'pending'
        ]
      );

      const activityId = activityResult.rows[0].id;

      // In Verarbeitungsqueue einreihen
      await this.db.query(
        `INSERT INTO timeline_processing_queue 
         (activity_id, raw_data, prompt_template, priority, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          activityId,
          JSON.stringify(request.rawData),
          `${request.feature}:${request.activityType}`,
          request.priority || 5,
          'queued'
        ]
      );

      return activityId;

    } catch (error) {
      console.error('Error capturing activity:', error);
      throw new Error(`Failed to capture activity: ${error.message}`);
    }
  }

  // Timeline Management
  async createTimeline(
    name: string,
    createdBy: string,
    description?: string,
    metadata?: any
  ): Promise<Timeline> {
    const result = await this.db.query(
      `INSERT INTO timelines (name, description, created_by, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, createdBy, metadata]
    );
    return result.rows[0];
  }

  async getTimelinesByUser(userId: string): Promise<Timeline[]> {
    const result = await this.db.query(
      `SELECT * FROM timelines 
       WHERE created_by = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getTimelineById(timelineId: string, userId: string): Promise<Timeline | null> {
    const result = await this.db.query(
      `SELECT * FROM timelines 
       WHERE id = $1 AND created_by = $2`,
      [timelineId, userId]
    );
    return result.rows[0] || null;
  }

  async updateTimeline(
    timelineId: string,
    userId: string,
    updates: Partial<Pick<Timeline, 'name' | 'description' | 'metadata'>>
  ): Promise<Timeline | null> {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramCount++}`);
      values.push(updates.metadata);
    }

    if (setClauses.length === 0) {
      return this.getTimelineById(timelineId, userId);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(timelineId, userId);

    const result = await this.db.query(
      `UPDATE timelines 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount++} AND created_by = $${paramCount++}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async deleteTimeline(timelineId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM timelines 
       WHERE id = $1 AND created_by = $2`,
      [timelineId, userId]
    );
    return result.rowCount > 0;
  }

  // Activity Management
  async createActivity(
    timelineId: string,
    featureType: string,
    actionType: string,
    contextData: any,
    createdBy: string,
    isMilestone: boolean = false,
    metadata?: any
  ): Promise<Activity> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Create activity
      const activityResult = await client.query(
        `INSERT INTO activities (timeline_id, feature_type, action_type, context_data, created_by, is_milestone, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [timelineId, featureType, actionType, contextData, createdBy, isMilestone, metadata]
      );

      const activity = activityResult.rows[0];

      // Queue for AI processing
      await client.query(
        `INSERT INTO activity_processing_queue (activity_id)
         VALUES ($1)`,
        [activity.id]
      );

      await client.query('COMMIT');
      return activity;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getActivitiesByTimeline(
    timelineId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Activity[]> {
    const result = await this.db.query(
      `SELECT a.* FROM activities a
       JOIN timelines t ON a.timeline_id = t.id
       WHERE a.timeline_id = $1 AND t.created_by = $2
       ORDER BY a.created_at DESC
       LIMIT $3 OFFSET $4`,
      [timelineId, userId, limit, offset]
    );
    return result.rows;
  }

  async getActivityById(activityId: string, userId: string): Promise<Activity | null> {
    const result = await this.db.query(
      `SELECT a.* FROM activities a
       JOIN timelines t ON a.timeline_id = t.id
       WHERE a.id = $1 AND t.created_by = $2`,
      [activityId, userId]
    );
    return result.rows[0] || null;
  }

  async deleteActivity(activityId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM activities a
       USING timelines t
       WHERE a.id = $1 AND a.timeline_id = t.id AND t.created_by = $2`,
      [activityId, userId]
    );
    return result.rowCount > 0;
  }

  // AI Processing
  async processActivityQueue(): Promise<void> {
    const pendingItems = await this.db.query(
      `SELECT aq.*, a.* FROM activity_processing_queue aq
       JOIN activities a ON aq.activity_id = a.id
       WHERE aq.status = 'pending'
       ORDER BY aq.created_at ASC
       LIMIT 10`
    );

    for (const item of pendingItems.rows) {
      await this.processActivityForAI(item);
    }
  }

  private async processActivityForAI(queueItem: any): Promise<void> {
    try {
      // Mark as processing
      await this.db.query(
        `UPDATE activity_processing_queue 
         SET status = 'processing', processed_at = NOW()
         WHERE id = $1`,
        [queueItem.id]
      );

      // Generate AI summary and title
      const { title, summary } = await this.generateAISummary(
        queueItem.feature_type,
        queueItem.action_type,
        queueItem.context_data
      );

      // Update activity with AI results
      await this.db.query(
        `UPDATE activities 
         SET ai_title = $1, ai_summary = $2
         WHERE id = $3`,
        [title, summary, queueItem.activity_id]
      );

      // Mark as completed
      await this.db.query(
        `UPDATE activity_processing_queue 
         SET status = 'completed'
         WHERE id = $1`,
        [queueItem.id]
      );
    } catch (error) {
      console.error('Error processing activity for AI:', error);
      
      // Mark as failed and increment retry count
      await this.db.query(
        `UPDATE activity_processing_queue 
         SET status = 'failed', error_message = $1, retry_count = retry_count + 1
         WHERE id = $2`,
        [error.message, queueItem.id]
      );
    }
  }

  private async generateAISummary(
    featureType: string,
    actionType: string,
    contextData: any
  ): Promise<{ title: string; summary: string }> {
    try {
      // Use the central LLM service for timeline activity summary generation
      return await this.llmService.generateTimelineActivitySummary(featureType, actionType, contextData);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return {
        title: `${featureType} - ${actionType}`,
        summary: 'AI-Zusammenfassung nicht verfügbar'
      };
    }
  }

  // Statistics and Analytics
  async getTimelineStats(timelineId: string, userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT 
         COUNT(*) as total_activities,
         COUNT(CASE WHEN is_milestone THEN 1 END) as milestones,
         COUNT(DISTINCT feature_type) as features_used,
         DATE_TRUNC('day', MIN(created_at)) as first_activity,
         DATE_TRUNC('day', MAX(created_at)) as last_activity
       FROM activities a
       JOIN timelines t ON a.timeline_id = t.id
       WHERE a.timeline_id = $1 AND t.created_by = $2`,
      [timelineId, userId]
    );
    return result.rows[0];
  }

  async getRecentActivities(userId: string, limit: number = 10): Promise<Activity[]> {
    const result = await this.db.query(
      `SELECT a.*, t.name as timeline_name
       FROM activities a
       JOIN timelines t ON a.timeline_id = t.id
       WHERE t.created_by = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  // Timeline Sharing (for future implementation)
  async shareTimeline(
    timelineId: string,
    ownerId: string,
    sharedWithUserId: string,
    permissions: 'read' | 'write' = 'read'
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO timeline_sharing (timeline_id, shared_by, shared_with, permissions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (timeline_id, shared_with) 
       DO UPDATE SET permissions = $4, created_at = NOW()`,
      [timelineId, ownerId, sharedWithUserId, permissions]
    );
  }

  async getSharedTimelines(userId: string): Promise<Timeline[]> {
    const result = await this.db.query(
      `SELECT t.*, ts.permissions, ts.shared_by, u.username as shared_by_username
       FROM timelines t
       JOIN timeline_sharing ts ON t.id = ts.timeline_id
       LEFT JOIN users u ON ts.shared_by = u.id
       WHERE ts.shared_with = $1
       ORDER BY ts.created_at DESC`,
      [userId]
    );
    return result.rows;
  }
}
