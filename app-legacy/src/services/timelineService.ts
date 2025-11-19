import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';

/**
 * Timeline API Service - verwendet den zentralen API-Client
 * Löst das Problem mit den falschen API-Pfaden und nutzt das bestehende API-System
 */

export interface Timeline {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface TimelineActivity {
  id: string;
  timeline_id: string;
  feature_name: string;
  activity_type: string;
  title: string;
  content: string;
  metadata: any;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
}

export interface TimelineActivitiesResponse {
  activities: TimelineActivity[];
  pagination: {
    page: number;
    limit: number;
    totalActivities: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface TimelineStats {
  totalTimelines: number;
  activeTimelines: number;
  totalActivities: number;
  activitiesThisWeek: number;
  processingQueue: number;
  recentActivity?: {
    timelineId: string;
    timelineName: string;
    lastActivity: string;
  };
}

export interface ActivityCaptureRequest {
  timelineId: string;
  feature: string;
  activityType: string;
  rawData: any;
  priority?: number;
}

export interface ActivityCaptureResponse {
  activityId: string;
  status: string;
  message: string;
}

class TimelineService {
  /**
   * Timeline Management
   */
  async getTimelines(): Promise<Timeline[]> {
    return apiClient.get<Timeline[]>(API_ENDPOINTS.timeline.list);
  }

  async createTimeline(data: { name: string; description?: string }): Promise<Timeline> {
    return apiClient.post<Timeline>(API_ENDPOINTS.timeline.create, data);
  }

  async getTimeline(timelineId: string): Promise<Timeline> {
    return apiClient.get<Timeline>(API_ENDPOINTS.timeline.detail(timelineId));
  }

  async updateTimeline(timelineId: string, data: { name?: string; description?: string }): Promise<Timeline> {
    return apiClient.put<Timeline>(API_ENDPOINTS.timeline.update(timelineId), data);
  }

  async deleteTimeline(timelineId: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.timeline.delete(timelineId));
  }

  async activateTimeline(timelineId: string): Promise<Timeline> {
    return apiClient.put<Timeline>(API_ENDPOINTS.timeline.activate(timelineId));
  }

  async archiveTimeline(timelineId: string): Promise<Timeline> {
    return apiClient.post<Timeline>(API_ENDPOINTS.timeline.archive(timelineId));
  }

  async exportTimeline(timelineId: string, format: 'pdf' | 'json' = 'pdf'): Promise<Blob> {
    return apiClient.get<Blob>(
      API_ENDPOINTS.timeline.export(timelineId, format),
      { responseType: 'blob' }
    );
  }

  /**
   * Timeline Activities
   */
  async getTimelineActivities(
    timelineId: string, 
    options: {
      page?: number;
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<TimelineActivitiesResponse> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.status) params.append('status', options.status);
    
    const url = `${API_ENDPOINTS.timeline.activities(timelineId)}${params.toString() ? '?' + params.toString() : ''}`;
    return apiClient.get<TimelineActivitiesResponse>(url);
  }

  async retryActivity(activityId: string): Promise<any> {
    return apiClient.post<any>(API_ENDPOINTS.timeline.activity.retry(activityId));
  }

  /**
   * Activity Capture
   */
  async captureActivity(request: ActivityCaptureRequest): Promise<ActivityCaptureResponse> {
    return apiClient.post<ActivityCaptureResponse>(
      API_ENDPOINTS.timeline.activity.capture,
      request
    );
  }

  async getActivityStatus(activityId: string): Promise<any> {
    return apiClient.get<any>(API_ENDPOINTS.timeline.activity.status(activityId));
  }

  async deleteActivity(activityId: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.timeline.activity.delete(activityId));
  }

  /**
   * Timeline Statistics
   */
  async getTimelineStats(): Promise<TimelineStats> {
    return apiClient.get<TimelineStats>(API_ENDPOINTS.timeline.stats);
  }

  /**
   * Sharing (planned features)
   */
  async shareTimeline(timelineId: string, data: { userId: string; permission: string }): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.timeline.sharing.share(timelineId), data);
  }

  async getSharedTimelines(): Promise<Timeline[]> {
    return apiClient.get<Timeline[]>(API_ENDPOINTS.timeline.sharing.shared);
  }

  /**
   * LEGACY COMPATIBILITY METHODS
   * Diese Methoden bieten Rückwärtskompatibilität für vorhandene Komponenten
   * die noch die alten fetch()-Aufrufe verwenden
   */

  /**
   * @deprecated Use getTimelines() instead
   * Compatibility method for existing components
   */
  async fetchTimelines(): Promise<Timeline[]> {
    console.warn('[DEPRECATED] Use timelineService.getTimelines() instead of fetchTimelines()');
    return this.getTimelines();
  }

  /**
   * @deprecated Use getTimelineStats() instead  
   * Compatibility method for existing components
   */
  async fetchTimelineStats(): Promise<TimelineStats> {
    console.warn('[DEPRECATED] Use timelineService.getTimelineStats() instead of fetchTimelineStats()');
    return this.getTimelineStats();
  }

  /**
   * @deprecated Use getTimelineActivities() instead
   * Compatibility method for existing components  
   */
  async fetchTimelineActivities(timelineId: string, page: number = 1): Promise<TimelineActivitiesResponse> {
    console.warn('[DEPRECATED] Use timelineService.getTimelineActivities() instead of fetchTimelineActivities()');
    return this.getTimelineActivities(timelineId, { page });
  }
}

// Singleton instance
export const timelineService = new TimelineService();
export default timelineService;

/**
 * MIGRATION UTILITY
 * Temporäre globale Verfügbarkeit für schrittweise Migration
 */
if (typeof window !== 'undefined') {
  (window as any).timelineService = timelineService;
  console.log('📈 Timeline Service available globally for migration');
}
