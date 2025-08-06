import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';

export interface MermaidDiagram {
  id: string;
  title: string;
  content: string;
  mermaidCode: string;
  score: number;
}

export interface ProcessSearchResult {
  diagrams: MermaidDiagram[];
  textualExplanation: string;
  processSteps: string[];
}

export interface ConversationMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ProcessSearchRequest {
  query: string;
  conversationHistory?: ConversationMessage[];
}

export interface ProcessOptimizeRequest {
  originalQuery: string;
  optimizationRequest: string;
  currentDiagrams?: MermaidDiagram[];
}

export interface RelatedProcessesRequest {
  diagram: MermaidDiagram;
}

export interface RelatedProcessesResponse {
  relatedDiagrams: MermaidDiagram[];
  count: number;
}

export interface ProcessHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  diagramsAvailable: boolean;
  error?: string;
}

export class ProcessService {
  /**
   * Search for processes and generate Mermaid diagrams
   */
  static async searchProcesses(request: ProcessSearchRequest): Promise<ProcessSearchResult> {
    try {
      const response = await apiClient.post<ProcessSearchResult>(
        API_ENDPOINTS.processes.search,
        request
      );
      return response;
    } catch (error) {
      console.error('Error searching processes:', error);
      throw new Error('Fehler bei der Prozesssuche. Bitte versuchen Sie es erneut.');
    }
  }

  /**
   * Optimize an existing process based on user feedback
   */
  static async optimizeProcess(request: ProcessOptimizeRequest): Promise<ProcessSearchResult> {
    try {
      const response = await apiClient.post<ProcessSearchResult>(
        API_ENDPOINTS.processes.optimize,
        request
      );
      return response;
    } catch (error) {
      console.error('Error optimizing process:', error);
      throw new Error('Fehler bei der Prozessoptimierung. Bitte versuchen Sie es erneut.');
    }
  }

  /**
   * Find related processes for a given diagram
   */
  static async getRelatedProcesses(request: RelatedProcessesRequest): Promise<RelatedProcessesResponse> {
    try {
      const response = await apiClient.post<RelatedProcessesResponse>(
        API_ENDPOINTS.processes.related,
        request
      );
      return response;
    } catch (error) {
      console.error('Error getting related processes:', error);
      throw new Error('Fehler beim Laden verwandter Prozesse. Bitte versuchen Sie es erneut.');
    }
  }

  /**
   * Health check for the process service
   */
  static async checkHealth(): Promise<ProcessHealthResponse> {
    try {
      const response = await apiClient.get<ProcessHealthResponse>(
        API_ENDPOINTS.processes.health
      );
      return response;
    } catch (error) {
      console.error('Error checking process service health:', error);
      throw new Error('Prozess-Service nicht verfügbar.');
    }
  }
}

export default ProcessService;
