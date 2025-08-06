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

export interface MermaidCodeImproveRequest {
  originalCode: string;
  title?: string;
  context?: string;
}

export interface MermaidCodeImproveResponse {
  improvedCode: string;
  improvements: string[];
  valid: boolean;
  confidence: number;
}

export interface MermaidValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
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

  /**
   * Improve Mermaid code using LLM
   */
  static async improveMermaidCode(request: MermaidCodeImproveRequest): Promise<MermaidCodeImproveResponse> {
    try {
      const response = await apiClient.post<MermaidCodeImproveResponse>(
        API_ENDPOINTS.processes.improveMermaid,
        request
      );
      return response;
    } catch (error) {
      console.error('Error improving Mermaid code:', error);
      throw new Error('Fehler bei der Mermaid-Code-Verbesserung. Bitte versuchen Sie es erneut.');
    }
  }

  /**
   * Validate Mermaid code syntax
   */
  static async validateMermaidCode(code: string): Promise<MermaidValidationResult> {
    try {
      const response = await apiClient.post<MermaidValidationResult>(
        API_ENDPOINTS.processes.validateMermaid,
        { code }
      );
      return response;
    } catch (error) {
      console.error('Error validating Mermaid code:', error);
      return {
        isValid: false,
        errors: ['Validierungsservice nicht verfügbar'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Search processes with automatic Mermaid code improvement
   */
  static async searchProcessesWithImprovement(request: ProcessSearchRequest): Promise<ProcessSearchResult> {
    try {
      console.log('ProcessService: Calling searchProcessesWithImprovement');
      const response = await apiClient.post<ProcessSearchResult>(
        `${API_ENDPOINTS.processes.search}/with-improvement`,
        request
      );
      console.log('ProcessService: Received improved search results');
      return response;
    } catch (error) {
      console.error('Error searching processes with improvement:', error);
      // Fallback to regular search if improvement fails
      console.log('ProcessService: Falling back to regular search');
      return this.searchProcesses(request);
    }
  }
}

export default ProcessService;
