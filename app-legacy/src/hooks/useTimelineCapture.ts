import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { timelineService, ActivityCaptureRequest } from '../services/timelineService';

interface UseTimelineCaptureReturn {
  captureActivity: (feature: string, activityType: string, data: any, priority?: number) => Promise<void>;
  captureScreenshotAnalysis: (analysisResult: any, filename?: string) => Promise<void>;
  captureCodeSearch: (searchQuery: string, results: any[], filters?: any) => Promise<void>;
  captureNoteCreation: (note: any) => Promise<void>;
  captureChatConversation: (chatId: string, userMessage: string, assistantResponse: string, metadata?: any) => Promise<void>;
  captureBilateralClarification: (clarificationData: any) => Promise<void>;
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

  // Convenience methods for specific features
  const captureScreenshotAnalysis = async (analysisResult: any, filename?: string): Promise<void> => {
    await captureActivity('screenshot-analysis', 'analysis_completed', {
      filename,
      analysis_result: analysisResult,
      detected_codes: analysisResult.codes?.length || 0,
      processing_timestamp: new Date().toISOString()
    }, 3);
  };

  const captureCodeSearch = async (searchQuery: string, results: any[], filters?: any): Promise<void> => {
    await captureActivity('code-lookup', 'search_performed', {
      search_query: searchQuery,
      filters,
      results_count: results.length,
      found_codes: results.slice(0, 5).map(r => ({
        code: r.code,
        company_name: r.companyName || 'Unknown',
        code_type: r.codeType || 'BDEW'
      }))
    }, 3);
  };

  const captureNoteCreation = async (note: any): Promise<void> => {
    await captureActivity('notes', 'note_created', {
      note_id: note.id,
      title: note.title,
      content: note.content,
      source_type: note.source_type,
      tags: note.tags
    }, 4);
  };

  const captureChatConversation = async (
    chatId: string, 
    userMessage: string, 
    assistantResponse: string, 
    metadata?: any
  ): Promise<void> => {
    await captureActivity('chat', 'conversation_completed', {
      chat_id: chatId,
      user_message: userMessage,
      assistant_response: assistantResponse,
      processing_time_ms: metadata?.processingTime,
      reasoning_quality: metadata?.reasoningQuality,
      api_calls_used: metadata?.apiCallsUsed
    }, 2);
  };

  const captureBilateralClarification = async (clarificationData: any): Promise<void> => {
    await captureActivity('bilateral-clarifications', 'clarification_processed', {
      clarification_id: clarificationData.id,
      partner_code: clarificationData.partner_code,
      status: clarificationData.status,
      processing_result: clarificationData.processing_result
    }, 2);
  };

  return { 
    captureActivity, 
    captureScreenshotAnalysis,
    captureCodeSearch,
    captureNoteCreation,
    captureChatConversation,
    captureBilateralClarification,
    isCapturing, 
    lastError 
  };
};
