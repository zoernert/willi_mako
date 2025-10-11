import advancedReasoningService from '../advancedReasoningService';
import { SessionEnvelope, SessionContextSettings, SessionPreferences } from '../../domain/api-v2/session.types';
import { ReasoningRequestInput, ReasoningResponse } from '../../domain/api-v2/reasoning.types';

const sanitizeMessages = (messages: any[] | undefined) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.role === 'string' && typeof message.content === 'string')
    .map((message) => ({ role: message.role, content: message.content }));
};

const mergeContextSettings = (
  sessionSettings: SessionContextSettings | undefined,
  overrideSettings: SessionContextSettings | undefined,
  useDetailedIntentAnalysis: boolean | undefined,
  overridePipeline: Record<string, any> | undefined
): SessionContextSettings | undefined => {
  const merged = {
    ...(sessionSettings || {}),
    ...(overrideSettings || {})
  } as SessionContextSettings;

  if (useDetailedIntentAnalysis !== undefined) {
    (merged as any).useDetailedIntentAnalysis = useDetailedIntentAnalysis;
  }

  if (overridePipeline) {
    (merged as any).overridePipeline = overridePipeline;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
};

const mergePreferences = (
  sessionPreferences: SessionPreferences,
  overridePreferences: Partial<SessionPreferences> | undefined,
  session: SessionEnvelope
): SessionPreferences & { userId: string; user_id: string; sessionId: string } => {
  const preferences: SessionPreferences = {
    companiesOfInterest: sessionPreferences.companiesOfInterest,
    preferredTopics: sessionPreferences.preferredTopics
  };

  if (overridePreferences?.companiesOfInterest) {
    preferences.companiesOfInterest = overridePreferences.companiesOfInterest;
  }

  if (overridePreferences?.preferredTopics) {
    preferences.preferredTopics = overridePreferences.preferredTopics;
  }

  return {
    ...preferences,
    userId: session.userId,
    user_id: session.userId,
    sessionId: session.sessionId
  };
};

export class ReasoningService {
  public async generate(session: SessionEnvelope, input: ReasoningRequestInput): Promise<ReasoningResponse> {
    const messages = sanitizeMessages(input.messages);
    const contextSettings = mergeContextSettings(
      session.contextSettings,
      input.contextSettingsOverride,
      input.useDetailedIntentAnalysis,
      input.overridePipeline
    );
    const preferences = mergePreferences(session.preferences, input.preferencesOverride, session);

    const result = await advancedReasoningService.generateReasonedResponse(
      input.query,
      messages,
      preferences,
      contextSettings
    );

    return {
      response: result.response,
      reasoningSteps: result.reasoningSteps,
      finalQuality: result.finalQuality,
      iterationsUsed: result.iterationsUsed,
      contextAnalysis: result.contextAnalysis,
      qaAnalysis: result.qaAnalysis,
      pipelineDecisions: result.pipelineDecisions,
      apiCallsUsed: result.apiCallsUsed,
      hybridSearchUsed: result.hybridSearchUsed,
      hybridSearchAlpha: result.hybridSearchAlpha,
      metadata: {
        sessionId: session.sessionId,
        usedDetailedIntentAnalysis: Boolean((contextSettings as any)?.useDetailedIntentAnalysis),
        usedOverridePipeline: Boolean(input.overridePipeline),
        contextSettings,
        preferences: {
          companiesOfInterest: preferences.companiesOfInterest,
          preferredTopics: preferences.preferredTopics
        }
      }
    };
  }
}

export const reasoningService = new ReasoningService();
