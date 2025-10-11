import { SessionContextSettings, SessionPreferences } from './session.types';

export interface ReasoningMessage {
  role: string;
  content: string;
}

export interface ReasoningRequestInput {
  query: string;
  messages?: ReasoningMessage[];
  contextSettingsOverride?: SessionContextSettings;
  preferencesOverride?: Partial<SessionPreferences>;
  overridePipeline?: Record<string, any> | undefined;
  useDetailedIntentAnalysis?: boolean;
}

export interface ReasoningResponseMetadata {
  sessionId: string;
  usedDetailedIntentAnalysis: boolean;
  usedOverridePipeline: boolean;
  contextSettings: SessionContextSettings | undefined;
  preferences: SessionPreferences;
}

export interface ReasoningResponse {
  response: string;
  reasoningSteps: any[];
  finalQuality: number;
  iterationsUsed: number;
  contextAnalysis: any;
  qaAnalysis: any;
  pipelineDecisions: any;
  apiCallsUsed: number;
  hybridSearchUsed?: boolean;
  hybridSearchAlpha?: number;
  metadata: ReasoningResponseMetadata;
}
