jest.mock('../../../src/services/flip-mode', () => ({
  __esModule: true,
  default: {
    analyzeClarificationNeed: jest.fn(),
    buildEnhancedQuery: jest.fn()
  }
}));

import flipModeService from '../../../src/services/flip-mode';
import { clarificationService } from '../../../src/services/api-v2/clarification.service';
import { SessionEnvelope } from '../../../src/domain/api-v2/session.types';

const mockedAnalyze = flipModeService.analyzeClarificationNeed as jest.Mock;
const mockedBuildQuery = flipModeService.buildEnhancedQuery as jest.Mock;

describe('ClarificationService', () => {
  const session: SessionEnvelope = {
    sessionId: 'session-clarify',
    userId: 'user-clarify',
    workspaceContext: {
      aiContextEnabled: true,
      storageLimitMb: 42,
      storageUsedMb: 3,
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
      workspacePriority: 'medium',
      includeUserDocuments: true,
      includeUserNotes: true,
      includeSystemKnowledge: true,
      includeM2CRoles: false
    },
    expiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockedAnalyze.mockReset();
    mockedBuildQuery.mockReset();
  });

  it('returns clarification analysis with optional enhanced query', async () => {
    mockedAnalyze.mockResolvedValue({
      needsClarification: true,
      ambiguityScore: 0.72,
      detectedTopics: ['Bilanzkreis'],
      suggestedQuestions: [
        {
          id: 'energy_type',
          question: 'Auf welchen Energieträger bezieht sich die Frage?',
          category: 'energy_type',
          options: ['Strom', 'Gas'],
          priority: 1
        }
      ],
      reasoning: 'unklarer Energieträger',
      sessionId: 'flip-session-1'
    });
    mockedBuildQuery.mockResolvedValue('Enhanced Query');

    const result = await clarificationService.analyze(session, 'Was ist GPKE?', {
      includeEnhancedQuery: true
    });

    expect(mockedAnalyze).toHaveBeenCalledWith('Was ist GPKE?', session.userId);
    expect(mockedBuildQuery).toHaveBeenCalledWith('Was ist GPKE?', session.userId);
    expect(result).toMatchObject({
      clarificationNeeded: true,
      ambiguityScore: 0.72,
      clarificationSessionId: 'flip-session-1',
      enhancedQuery: 'Enhanced Query'
    });
    expect(result.suggestedQuestions.length).toBe(1);
  });
});
