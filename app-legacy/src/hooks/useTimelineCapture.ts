import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { timelineService, ActivityCaptureRequest } from '../services/timelineService';

interface UseTimelineCaptureReturn {
  captureActivity: (feature: string, activityType: string, data: any, priority?: number) => Promise<void>;
  isCapturing: boolean;
  lastError: string | null;
}

export const useTimelineCapture = (): UseTimelineCaptureReturn => {
  const { state } = useAuth();
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const captureActivity = async (
    feature: string, 
    activityType: string, 
    data: any,
    priority: number = 5
  ): Promise<void> => {
    // Früher Ausstieg wenn keine aktive Timeline
    if (!state.activeTimelineId) {
      console.warn('No active timeline set, skipping activity capture');
      return;
    }

    // Früher Ausstieg wenn User nicht eingeloggt
    if (!state.user || !state.token) {
      console.warn('User not authenticated, skipping activity capture');
      return;
    }

    try {
      setIsCapturing(true);
      setLastError(null);
      
      const request: ActivityCaptureRequest = {
        timelineId: state.activeTimelineId,
        feature,
        activityType,
        rawData: data,
        priority
      };

      const result = await timelineService.captureActivity(request);
      console.log('Timeline activity captured:', result.activityId);
      
    } catch (error) {
      console.error('Failed to capture timeline activity:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      // Fehler nicht dem User anzeigen, da es den Workflow nicht blockieren soll
    } finally {
      setIsCapturing(false);
    }
  };

  return { captureActivity, isCapturing, lastError };
};
