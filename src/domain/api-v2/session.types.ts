export type SessionContextSettings = {
  useWorkspaceOnly?: boolean;
  workspacePriority?: 'high' | 'medium' | 'low' | 'disabled';
  includeUserDocuments?: boolean;
  includeUserNotes?: boolean;
  includeSystemKnowledge?: boolean;
  includeM2CRoles?: boolean;
  locale?: string;
  timezone?: string;
};

export interface SessionPreferences {
  companiesOfInterest: string[];
  preferredTopics: string[];
}

export interface SessionPolicyFlags {
  role: string;
  canAccessCs30: boolean;
}

export interface SessionWorkspaceContext {
  aiContextEnabled: boolean;
  storageLimitMb: number;
  storageUsedMb: number;
  workspacePriority: 'disabled' | 'low' | 'medium' | 'high';
  features: {
    autoTagging: boolean;
    contextOverridesAllowed: boolean;
  };
}

export interface SessionDocument {
  sessionId: string;
  userId: string;
  legacyChatId?: string;
  preferences: SessionPreferences;
  contextSettings?: SessionContextSettings;
  workspaceContext: SessionWorkspaceContext;
  policyFlags: SessionPolicyFlags;
  metadata: {
    createdBy: 'api-v2';
    version: string;
    sourceIp?: string;
    userAgent?: string;
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  preferences?: Partial<SessionPreferences>;
  contextSettings?: SessionContextSettings;
  sourceIp?: string;
  userAgent?: string;
  ttlMinutes?: number;
  legacyChatId?: string;
}

export interface SessionEnvelope {
  sessionId: string;
  userId: string;
  legacyChatId?: string;
  workspaceContext: SessionWorkspaceContext;
  policyFlags: SessionPolicyFlags;
  preferences: SessionPreferences;
  contextSettings?: SessionContextSettings;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
