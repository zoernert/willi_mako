// Community Hub Types for Frontend
// CR-COMMUNITY-HUB-001
// Autor: AI Assistant
// Datum: 2025-08-10

export type ThreadStatus = 'discussing' | 'review' | 'final';
export type CommunityInitiativeStatus = 'draft' | 'refining' | 'submitted';

export interface CommunityThread {
  id: string;
  title: string;
  status: ThreadStatus;
  tags: string[];
  document_content: {
    problem_description?: string;
    context?: string;
    analysis?: string;
    solution_proposals?: CommunityProposal[];
    final_solution?: {
      content: string;
      approved_by?: string;
      approved_at?: string;
    };
    meta?: Record<string, any>;
  };
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityProposal {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  votes?: number;
}

export interface CommunityComment {
  id: string;
  thread_id: string;
  block_id: string; // Reference to section or proposal ID
  content: string;
  created_by_user_id: string;
  created_at: string;
}

export interface CommunityInitiative {
  id: string;
  thread_id: string;
  title: string;
  draft_content: string; // LLM generated
  status: CommunityInitiativeStatus;
  target_audience?: string; // e.g. "BDEW", "Regulierungsbehörde", "Standardisierungsgremium"
  submission_details?: {
    contact_person?: string;
    contact_email?: string;
    additional_notes?: string;
    [key: string]: any;
  };
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

// Request/Response Types
export interface CreateThreadRequest {
  title: string;
  initialContent?: {
    problem_description?: string;
    context?: string;
  };
  tags?: string[];
}

export interface UpdateDocumentRequest {
  operations: PatchOperation[];
  version?: string;
}

export interface PatchOperation {
  op: 'replace' | 'add' | 'upsertProposal';
  path?: string;
  proposalId?: string;
  value: string | object;
}

export interface CreateInitiativeRequest {
  title: string;
  target_audience?: string;
}

export interface UpdateInitiativeRequest {
  title?: string;
  target_audience?: string;
  draft_content?: string;
}

export interface UpdateInitiativeStatusRequest {
  status: CommunityInitiativeStatus;
  submission_details?: {
    contact_person?: string;
    contact_email?: string;
    additional_notes?: string;
    [key: string]: any;
  };
}

export interface CreateCommentRequest {
  blockId: string;
  content: string;
}

export interface UpdateThreadStatusRequest {
  status: ThreadStatus;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ThreadListResponse {
  threads: CommunityThread[];
  total: number;
  page: number;
  limit: number;
}

export interface InitiativeListResponse {
  initiatives: CommunityInitiative[];
  total: number;
  page: number;
  limit: number;
}

// Search Types
export interface CommunitySearchRequest {
  query: string;
  tags?: string[];
  status?: ThreadStatus[];
  limit?: number;
  offset?: number;
}

export interface CommunitySearchResult {
  threads: CommunityThread[];
  total: number;
}

// Escalation from Chat
export interface ChatEscalationRequest {
  conversationContext: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;
    entities?: string[];
    metadata?: Record<string, any>;
  };
  suggestedTitle?: string;
}

// UI State Types
export interface CommunityViewState {
  selectedThread?: CommunityThread;
  selectedInitiative?: CommunityInitiative;
  isEditing: boolean;
  isEscalating: boolean;
  filter: {
    status?: ThreadStatus[];
    tags?: string[];
    search?: string;
  };
}

// Constants
export const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  discussing: 'Diskussion',
  review: 'Überprüfung',
  final: 'Abgeschlossen'
};

export const INITIATIVE_STATUS_LABELS: Record<CommunityInitiativeStatus, string> = {
  draft: 'Entwurf',
  refining: 'Überarbeitung',
  submitted: 'Eingereicht'
};

export const TARGET_AUDIENCE_OPTIONS = [
  'BDEW',
  'Regulierungsbehörde', 
  'Standardisierungsgremium',
  'EDI@Energy',
  'VDE|FNN',
  'Bundesnetzagentur',
  'Andere'
] as const;

export type TargetAudience = typeof TARGET_AUDIENCE_OPTIONS[number];
