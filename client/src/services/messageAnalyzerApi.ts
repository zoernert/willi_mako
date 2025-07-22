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
    }[];
  };
  format: 'EDIFACT' | 'XML' | 'TEXT' | 'UNKNOWN';
}

export const messageAnalyzerApi = {
  analyze: async (message: string): Promise<AnalysisResult> => {
    const response = await apiClient.post('/message-analyzer/analyze', { message }) as any;
    return response.data;
  },
};
