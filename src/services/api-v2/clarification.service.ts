import flipModeService from '../flip-mode';
import { SessionEnvelope } from '../../domain/api-v2/session.types';
import { ClarificationAnalyzeOptions, ClarificationAnalysisResult } from '../../domain/api-v2/clarification.types';

export class ClarificationService {
  public async analyze(
    session: SessionEnvelope,
    query: string,
    options: ClarificationAnalyzeOptions = {}
  ): Promise<ClarificationAnalysisResult> {
    const analysis = await flipModeService.analyzeClarificationNeed(query, session.userId);

    const result: ClarificationAnalysisResult = {
      clarificationNeeded: analysis.needsClarification,
      ambiguityScore: analysis.ambiguityScore,
      detectedTopics: analysis.detectedTopics,
      reasoning: analysis.reasoning,
      suggestedQuestions: analysis.suggestedQuestions,
      clarificationSessionId: analysis.sessionId
    };

    if (options.includeEnhancedQuery) {
      result.enhancedQuery = await flipModeService.buildEnhancedQuery(query, session.userId);
    }

    return result;
  }
}

export const clarificationService = new ClarificationService();
