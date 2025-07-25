// client/src/services/messageAnalyzerApi.ts
import apiClient from './apiClient';

export interface AnalysisResult {
  summary: string;
  plausibilityChecks: string[];
  structuredData: {
    segments: {
      tag: string;
      elements: string[];
      original: string;
      description?: string;
      resolvedCodes?: { [key: string]: string };
    }[];
  };
  format: 'EDIFACT' | 'XML' | 'TEXT' | 'UNKNOWN';
}

export const messageAnalyzerApi = {
  analyze: async (message: string): Promise<AnalysisResult> => {
    const response = await apiClient.post('/message-analyzer/analyze', { message }) as any;
    console.log('📄 MessageAnalyzer API Response:', response);
    
    // The backend returns { success: true, data: AnalysisResult }
    // So we need to extract the actual data
    if (response.success && response.data) {
      return response.data as AnalysisResult;
    } else if (response.data && response.data.data) {
      // In case the response structure is nested
      return response.data.data as AnalysisResult;
    } else {
      // Fallback: return the response as-is
      return response as AnalysisResult;
    }
  },
};
