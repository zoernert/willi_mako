import { WorkspaceService } from '../workspaceService';
import { UserPreferencesRepository } from '../../modules/user/user.repository';
import { SessionRepository } from './repositories/session.repository';
import { CreateSessionInput, SessionEnvelope } from '../../domain/api-v2/session.types';
export declare class SessionService {
    private readonly repository;
    private readonly workspaceService;
    private readonly userPreferencesRepository;
    constructor(repository?: SessionRepository, workspaceService?: WorkspaceService, userPreferencesRepository?: UserPreferencesRepository);
    createSession(input: CreateSessionInput): Promise<SessionEnvelope>;
    getSession(sessionId: string): Promise<SessionEnvelope>;
    deleteSession(sessionId: string): Promise<void>;
    touchSession(sessionId: string): Promise<void>;
    private loadPolicyFlags;
    private loadWorkspaceContext;
    private loadUserPreferences;
    private ensureLegacyChat;
    private toEnvelope;
}
export declare const sessionService: SessionService;
//# sourceMappingURL=session.service.d.ts.map