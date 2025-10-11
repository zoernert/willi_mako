import { randomUUID } from 'crypto';
import { DatabaseHelper } from '../../../src/utils/database';
import { SessionRepository } from '../../../src/services/api-v2/repositories/session.repository';

const mockWorkspaceInstance = {
  getUserWorkspaceSettings: jest.fn()
};

const mockPreferencesInstance = {
  getUserPreferences: jest.fn()
};

jest.mock('../../../src/services/workspaceService', () => ({
  WorkspaceService: jest.fn(() => mockWorkspaceInstance)
}));

jest.mock('../../../src/modules/user/user.repository', () => ({
  UserPreferencesRepository: jest.fn(() => mockPreferencesInstance)
}));

jest.mock('@/routes/utils/ensureChatColumns', () => ({
  ensureChatColumns: jest.fn().mockResolvedValue(undefined)
}));

import { SessionService } from '../../../src/services/api-v2/session.service';

describe('SessionService', () => {
  const repository: jest.Mocked<SessionRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkspaceInstance.getUserWorkspaceSettings.mockResolvedValue({
      ai_context_enabled: true,
      auto_tag_enabled: true,
      storage_limit_mb: 500,
      storage_used_mb: 42
    });
    mockPreferencesInstance.getUserPreferences.mockResolvedValue({
      companies_of_interest: ['A'],
      preferred_topics: ['Topic'],
      notification_settings: {}
    });
  });

  it('creates session and stores document', async () => {
    repository.save.mockResolvedValue({} as any);

    const executeSpy = jest.spyOn(DatabaseHelper, 'executeQuerySingle');
    executeSpy.mockResolvedValueOnce({ role: 'user', can_access_cs30: false } as any);
    executeSpy.mockResolvedValueOnce({ id: randomUUID() } as any);

    const service = new SessionService(repository);

    const session = await service.createSession({
      userId: randomUUID(),
      preferences: { companiesOfInterest: ['B'] }
    });

    expect(typeof session.sessionId).toBe('string');
    expect(typeof session.legacyChatId).toBe('string');
    expect(session.preferences.companiesOfInterest).toEqual(['B']);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(executeSpy).toHaveBeenCalledTimes(2);

    executeSpy.mockRestore();
  });
});
