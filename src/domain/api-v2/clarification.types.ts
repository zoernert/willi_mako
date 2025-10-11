import { ClarificationQuestion } from '../../services/flip-mode';

export interface ClarificationAnalyzeOptions {
  includeEnhancedQuery?: boolean;
}

export interface ClarificationAnalysisResult {
  clarificationNeeded: boolean;
  ambiguityScore: number;
  detectedTopics: string[];
  reasoning: string;
  suggestedQuestions: ClarificationQuestion[];
  clarificationSessionId?: string;
  enhancedQuery?: string;
}
