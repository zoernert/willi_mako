import contextManager from '../contextManager';
import type { ContextSettings as ManagerContextSettings } from '../contextManager';
import { SessionContextSettings, SessionEnvelope } from '../../domain/api-v2/session.types';
import { ContextResolveOptions, ContextResolutionResult } from '../../domain/api-v2/context.types';

const sanitizeMessages = (messages: Array<{ role: string; content: string }> | undefined) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.role === 'string' && typeof message.content === 'string')
    .map((message) => ({ role: message.role, content: message.content }));
};

const mergeContextSettings = (
  sessionSettings: SessionContextSettings | undefined,
  overrideSettings: SessionContextSettings | undefined
): SessionContextSettings | undefined => {
  if (!sessionSettings && !overrideSettings) {
    return undefined;
  }

  return {
    ...(sessionSettings || {}),
    ...(overrideSettings || {})
  } as SessionContextSettings;
};

const toManagerSettings = (
  settings: SessionContextSettings | undefined
): ManagerContextSettings | undefined => {
  if (!settings) {
    return undefined;
  }

  const managerSettings: ManagerContextSettings = {
    useWorkspaceOnly: settings.useWorkspaceOnly ?? false,
    workspacePriority: settings.workspacePriority ?? 'medium',
    includeUserDocuments: settings.includeUserDocuments ?? true,
    includeUserNotes: settings.includeUserNotes ?? true,
    includeSystemKnowledge: settings.includeSystemKnowledge ?? true,
    includeM2CRoles: settings.includeM2CRoles ?? false
  };

  return managerSettings;
};

export class ContextService {
  public async resolve(
    session: SessionEnvelope,
    query: string,
    options: ContextResolveOptions = {}
  ): Promise<ContextResolutionResult> {
    const messages = sanitizeMessages(options.messages);
    const contextSettings = mergeContextSettings(session.contextSettings, options.contextSettingsOverride);
    const managerSettings = toManagerSettings(contextSettings);

    const result = await contextManager.determineOptimalContext(
      query,
      session.userId,
      messages,
      managerSettings
    );

    return {
      contextSettingsUsed: contextSettings,
      decision: result.contextDecision,
      publicContext: result.publicContext,
      userContext: result.userContext
    };
  }
}

export const contextService = new ContextService();
