// Community Hub Types
// CR-COMMUNITY-HUB-001
// Autor: AI Assistant
// Datum: 2025-08-09

export interface CommunityThread {
  id: string;
  title: string;
  status: ThreadStatus;
  tags: string[];
  document_content: LivingDocument;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export type ThreadStatus = 'discussing' | 'review' | 'final';

export interface LivingDocument {
  problem_description?: string;
  context?: string;
  analysis?: string;
  solution_proposals?: SolutionProposal[];
  final_solution?: FinalSolution;
  meta?: Record<string, any>;
}

export interface SolutionProposal {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  votes?: number;
}

export interface FinalSolution {
  content: string;
  approved_by?: string;
  approved_at?: string;
}

export interface DocumentComment {
  id: string;
  thread_id: string;
  block_id: string;
  content: string;
  created_by_user_id: string;
  created_at: string;
}

export interface CommunityVectorPoint {
  thread_id: string;
  section_key: 'problem_description' | 'context' | 'analysis' | 'final_solution' | 'proposal';
  content: string;
  proposal_id?: string;
  created_at: string;
}

export interface PatchOperation {
  op: 'replace' | 'add' | 'upsertProposal';
  path?: string;
  proposalId?: string;
  value: string | object;
}

export interface ThreadSummary {
  id: string;
  title: string;
  status: ThreadStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  proposal_count: number;
  comment_count: number;
}

export interface CreateThreadRequest {
  title: string;
  initialContent?: Partial<LivingDocument>;
  tags?: string[];
}

export interface UpdateDocumentRequest {
  operations: PatchOperation[];
  version?: string; // For optimistic concurrency control
}

export interface CreateCommentRequest {
  blockId: string;
  content: string;
}

export interface UpdateStatusRequest {
  status: ThreadStatus;
}

export interface CreateFaqFromThreadRequest {
  threadId: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ThreadResponse extends ApiResponse<CommunityThread> {
  changed?: string[];
}

export interface ThreadListResponse extends ApiResponse<ThreadSummary[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Feature flags
export interface CommunityFeatureFlags {
  FEATURE_COMMUNITY_HUB: boolean;
  FEATURE_COMMUNITY_ESCALATION: boolean;
  COMMUNITY_ENABLE_PUBLIC_READ: boolean;
}

// Audit log entry
export interface CommunityAuditEntry {
  id: string;
  thread_id: string;
  user_id: string;
  ops_json: PatchOperation[];
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
