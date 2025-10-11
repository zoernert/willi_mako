jest.mock('../../../src/services/advancedReasoningService', () => ({
  __esModule: true,
  default: {
    generateReasonedResponse: jest.fn()
  }
}));

import advancedReasoningService from '../../../src/services/advancedReasoningService';
import { reasoningService } from '../../../src/services/api-v2/reasoning.service';
import { SessionEnvelope } from '../../../src/domain/api-v2/session.types';

const mockedGenerate = advancedReasoningService.generateReasonedResponse as jest.Mock;

describe('ReasoningService', () => {
  const session: SessionEnvelope = {
    sessionId: 'session-1',
    userId: 'user-1',
    legacyChatId: 'chat-1',
    workspaceContext: {
      aiContextEnabled: true,
      storageLimitMb: 100,
      storageUsedMb: 10,
      workspacePriority: 'medium',
      features: {
        autoTagging: true,
        contextOverridesAllowed: true
      }
    },
    policyFlags: {
      role: 'user',
      canAccessCs30: false
    },
    preferences: {
      companiesOfInterest: ['A'],
      preferredTopics: ['B']
    },
    contextSettings: {
      useWorkspaceOnly: false,
      workspacePriority: 'medium',
      includeUserDocuments: true,
      includeUserNotes: true,
      includeSystemKnowledge: true,
      includeM2CRoles: false,
      locale: 'de-DE'
    },
    expiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockedGenerate.mockReset();
    mockedGenerate.mockResolvedValue({
      response: 'Antwort',
      reasoningSteps: [],
      finalQuality: 0.8,
      iterationsUsed: 1,
      contextAnalysis: {},
      qaAnalysis: {},
      pipelineDecisions: {},
      apiCallsUsed: 3,
      hybridSearchUsed: false
    });
  });

  it('forwards sanitized messages and merged preferences', async () => {
    const result = await reasoningService.generate(session, {
      query: 'Was ist GPKE?',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hallo' },
        { role: 123 as any, content: 'invalid' }
      ],
      preferencesOverride: { preferredTopics: ['GPKE'] },
      useDetailedIntentAnalysis: true
    });

    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    const [, messagesArg, preferencesArg, contextSettingsArg] = mockedGenerate.mock.calls[0];

    expect(messagesArg).toEqual([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hallo' }
    ]);
    expect(preferencesArg).toMatchObject({
      companiesOfInterest: ['A'],
      preferredTopics: ['GPKE'],
      userId: session.userId,
      sessionId: session.sessionId
    });
    expect((contextSettingsArg as any).useDetailedIntentAnalysis).toBe(true);

    expect(result.metadata.sessionId).toBe(session.sessionId);
    expect(result.metadata.usedDetailedIntentAnalysis).toBe(true);
  });
});
