jest.mock('../../../src/services/contextManager', () => ({
  __esModule: true,
  default: {
    determineOptimalContext: jest.fn()
  }
}));

import contextManager from '../../../src/services/contextManager';
import { contextService } from '../../../src/services/api-v2/context.service';
import { SessionEnvelope } from '../../../src/domain/api-v2/session.types';

const mockedDetermine = contextManager.determineOptimalContext as jest.Mock;

describe('ContextService', () => {
  const session: SessionEnvelope = {
    sessionId: 'session-ctx',
    userId: 'user-ctx',
    workspaceContext: {
      aiContextEnabled: true,
      storageLimitMb: 200,
      storageUsedMb: 50,
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
      companiesOfInterest: [],
      preferredTopics: []
    },
    contextSettings: {
      useWorkspaceOnly: false,
      workspacePriority: 'low',
      includeUserDocuments: false,
      includeUserNotes: true,
      includeSystemKnowledge: true,
      includeM2CRoles: false
    },
    expiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockedDetermine.mockReset();
    mockedDetermine.mockResolvedValue({
      publicContext: [],
      userContext: {
        userDocuments: [],
        userNotes: [],
        suggestedDocuments: [],
        relatedNotes: [],
        contextSummary: 'none'
      },
      contextDecision: {
        useUserContext: false,
        includeDocuments: false,
        includeNotes: false,
        reason: 'test'
      }
    });
  });

  it('merges session settings and forwards sanitized history', async () => {
    const result = await contextService.resolve(session, 'Thema GPKE', {
      messages: [
        { role: 'user', content: 'Hallo' },
        { role: 'assistant', content: 'Antwort' },
        { role: 42 as any, content: 'invalid' }
      ],
      contextSettingsOverride: {
        includeUserDocuments: true,
        workspacePriority: 'high'
      }
    });

    expect(mockedDetermine).toHaveBeenCalledTimes(1);
    const callArgs = mockedDetermine.mock.calls[0];
    expect(callArgs[0]).toBe('Thema GPKE');
    expect(callArgs[1]).toBe(session.userId);
    expect(callArgs[2]).toEqual([
      { role: 'user', content: 'Hallo' },
      { role: 'assistant', content: 'Antwort' }
    ]);
    expect(callArgs[3]).toMatchObject({
      includeUserDocuments: true,
      workspacePriority: 'high'
    });

    expect(result.contextSettingsUsed).toMatchObject({
      includeUserDocuments: true,
      workspacePriority: 'high'
    });
    expect(result.decision.reason).toBe('test');
  });
});
