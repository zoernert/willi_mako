import { randomUUID } from 'crypto';
import { DatabaseHelper } from '../../utils/database';
import { WorkspaceService } from '../workspaceService';
import { UserPreferencesRepository } from '../../modules/user/user.repository';
import { SessionRepository, MongoSessionRepository } from './repositories/session.repository';
import {
  CreateSessionInput,
  SessionDocument,
  SessionEnvelope,
  SessionPolicyFlags,
  SessionPreferences,
  SessionWorkspaceContext
} from '../../domain/api-v2/session.types';
import { AppError } from '../../middleware/errorHandler';
import { ensureChatColumns } from '../../routes/utils/ensureChatColumns';

const DEFAULT_SESSION_TTL_MINUTES = 60 * 24 * 30; // 30 Tage
const DEFAULT_WORKSPACE_PRIORITY: SessionWorkspaceContext['workspacePriority'] = 'medium';

export class SessionService {
  constructor(
    private readonly repository: SessionRepository = new MongoSessionRepository(),
    private readonly workspaceService: WorkspaceService = new WorkspaceService(),
    private readonly userPreferencesRepository: UserPreferencesRepository = new UserPreferencesRepository()
  ) {}

  public async createSession(input: CreateSessionInput): Promise<SessionEnvelope> {
    const sessionId = randomUUID();
    const now = new Date();
    const ttlMinutes = input.ttlMinutes ?? Number(process.env.API_V2_SESSION_TTL_MINUTES || DEFAULT_SESSION_TTL_MINUTES);
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);

    const policyFlags = await this.loadPolicyFlags(input.userId);
    const workspaceContext = await this.loadWorkspaceContext(input.userId);
    const preferences = await this.loadUserPreferences(input.userId, input.preferences);
    const legacyChatId = input.legacyChatId ?? await this.ensureLegacyChat(input.userId);

    const sessionDocument: SessionDocument = {
      sessionId,
      userId: input.userId,
      legacyChatId,
      preferences,
      contextSettings: input.contextSettings,
      workspaceContext,
      policyFlags,
      metadata: {
        createdBy: 'api-v2',
        version: 'v1',
        sourceIp: input.sourceIp,
        userAgent: input.userAgent
      },
      createdAt: now,
      updatedAt: now,
      expiresAt
    };

    await this.repository.save(sessionDocument);
  return this.toEnvelope(sessionDocument);
  }

  public async getSession(sessionId: string): Promise<SessionEnvelope> {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }
    return this.toEnvelope(session);
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.repository.delete(sessionId);
  }

  public async touchSession(sessionId: string): Promise<void> {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      return;
    }

    session.updatedAt = new Date();
    await this.repository.save(session);
  }

  private async loadPolicyFlags(userId: string): Promise<SessionPolicyFlags> {
    const row = await DatabaseHelper.executeQuerySingle<{ role: string; can_access_cs30: boolean }>(
      'SELECT role, can_access_cs30 FROM users WHERE id = $1',
      [userId]
    );

    if (!row) {
      throw new AppError('Benutzer wurde nicht gefunden', 404);
    }

    return {
      role: row.role,
      canAccessCs30: Boolean(row.can_access_cs30)
    };
  }

  private async loadWorkspaceContext(userId: string): Promise<SessionWorkspaceContext> {
    const settings = await this.workspaceService.getUserWorkspaceSettings(userId);

    return {
      aiContextEnabled: Boolean(settings.ai_context_enabled),
      storageLimitMb: settings.storage_limit_mb ?? 0,
      storageUsedMb: settings.storage_used_mb ?? 0,
      workspacePriority: DEFAULT_WORKSPACE_PRIORITY,
      features: {
        autoTagging: Boolean(settings.auto_tag_enabled),
        contextOverridesAllowed: true
      }
    };
  }

  private async loadUserPreferences(
    userId: string,
    overrides?: Partial<SessionPreferences>
  ): Promise<SessionPreferences> {
    const prefs = await this.userPreferencesRepository.getUserPreferences(userId);

    const base: SessionPreferences = {
      companiesOfInterest: prefs?.companies_of_interest || [],
      preferredTopics: prefs?.preferred_topics || []
    };

    return {
      companiesOfInterest: overrides?.companiesOfInterest ?? base.companiesOfInterest,
      preferredTopics: overrides?.preferredTopics ?? base.preferredTopics
    };
  }

  private async ensureLegacyChat(userId: string): Promise<string> {
    if (!userId) {
      throw new AppError('Benutzer-ID fehlt für Session-Aufbau', 400);
    }

    await ensureChatColumns();

    const title = `API v2 Session ${new Date().toISOString().slice(0, 10)}`;
    const result = await DatabaseHelper.executeQuerySingle<{ id: string }>(
      `INSERT INTO chats (user_id, title, metadata)
       VALUES ($1, $2, jsonb_build_object('apiV2Session', 'true'))
       RETURNING id`,
      [userId, title]
    );

    if (!result?.id) {
      throw new AppError('Legacy-Chat konnte nicht erstellt werden', 500);
    }

    return result.id;
  }

  private toEnvelope(document: SessionDocument): SessionEnvelope {
    return {
      sessionId: document.sessionId,
      userId: document.userId,
      legacyChatId: document.legacyChatId,
      workspaceContext: document.workspaceContext,
      policyFlags: document.policyFlags,
      preferences: document.preferences,
      contextSettings: document.contextSettings,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      expiresAt: document.expiresAt.toISOString()
    };
  }
}

export const sessionService = new SessionService();
