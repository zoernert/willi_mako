// TypeScript Interfaces für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Type-Definitionen für das Bilateral Clarification System

// Basis-Enums für bessere Type-Safety
export type ClarificationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type ClarificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ClarificationCaseType = 'B2B' | 'GENERAL' | 'TECHNICAL' | 'BILLING';
export type AttachmentType = 'DOCUMENT' | 'EDIFACT' | 'EMAIL' | 'IMAGE' | 'OTHER';
export type AttachmentCategory = 'GENERAL' | 'URSPRUNG' | 'FEHLER' | 'KORREKTUR' | 'KOMMUNIKATION';
export type NoteType = 'USER' | 'SYSTEM' | 'AI_SUGGESTION' | 'STATUS_CHANGE' | 'COMMUNICATION';
export type EmailDirection = 'INCOMING' | 'OUTGOING';
export type EmailType = 'CLARIFICATION_REQUEST' | 'RESPONSE' | 'ESCALATION' | 'NOTIFICATION' | 'INTERNAL' | 'OTHER';
export type ActivityType = 'SHARED' | 'UNSHARED' | 'COMMENTED' | 'VIEWED' | 'HELPED' | 'STATUS_CHANGED' | 'ASSIGNED';

// Hauptinterface für bilaterale Klärfälle
export interface BilateralClarification {
  id: number;
  title: string;
  description?: string;
  marketPartnerCode: string;
  marketPartnerName?: string;
  caseType: ClarificationCaseType;
  status: ClarificationStatus;
  priority: ClarificationPriority;
  createdBy: string; // UUID
  assignedTo?: string; // UUID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  dueDate?: string; // ISO timestamp
  resolutionDate?: string; // ISO timestamp
  resolutionNotes?: string;
  tags: string[];
  sharedWithTeam: boolean;
  teamId?: string; // UUID
  externalCaseId?: string;
  sourceSystem: string;
  
  // Audit fields
  version: number;
  lastModifiedBy?: string; // UUID
  archived: boolean;
  archivedAt?: string; // ISO timestamp
  
  // Related data (populated by joins/includes)
  attachments?: ClarificationAttachment[];
  notes?: ClarificationNote[];
  teamComments?: TeamComment[];
  emails?: ClarificationEmail[];
  teamActivities?: TeamActivity[];
  
  // Computed fields
  isOverdue?: boolean;
  daysSinceCreated?: number;
  attachmentCount?: number;
  noteCount?: number;
  commentCount?: number;
}

// Interface für Attachments
export interface ClarificationAttachment {
  id: number;
  clarificationId: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string; // UUID
  uploadedAt: string; // ISO timestamp
  attachmentType: AttachmentType;
  attachmentCategory: AttachmentCategory;
  description?: string;
  isSensitive: boolean;
  archived: boolean;
  archivedAt?: string; // ISO timestamp
  
  // Computed fields
  fileSizeFormatted?: string; // "1.5 MB"
  uploaderName?: string; // Populated from user data
}

// Interface für Notizen
export interface ClarificationNote {
  id: number;
  clarificationId: number;
  content: string;
  noteType: NoteType;
  createdBy: string; // UUID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  isInternal: boolean;
  linkedAttachmentId?: number;
  linkedEmailId?: number;
  tags: string[];
  isPinned: boolean;
  archived: boolean;
  archivedAt?: string; // ISO timestamp
  
  // Computed fields
  authorName?: string; // Populated from user data
  linkedAttachment?: ClarificationAttachment;
  linkedEmail?: ClarificationEmail;
}

// Interface für Team-Kommentare
export interface TeamComment {
  id: number;
  clarificationId: number;
  content: string;
  createdBy: string; // UUID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  parentCommentId?: number;
  isResolved: boolean;
  resolvedBy?: string; // UUID
  resolvedAt?: string; // ISO timestamp
  mentionedUsers: string[]; // UUIDs
  reactions: Record<string, string[]>; // emoji -> user UUIDs
  archived: boolean;
  archivedAt?: string; // ISO timestamp
  
  // Computed fields
  authorName?: string; // Populated from user data
  resolverName?: string; // Populated from user data
  mentionedUserNames?: string[]; // Populated from user data
  parentComment?: TeamComment;
  childComments?: TeamComment[];
  reactionCount?: number;
}

// Interface für Email-Records
export interface ClarificationEmail {
  id: number;
  clarificationId: number;
  direction: EmailDirection;
  subject?: string;
  fromAddress?: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  messageId?: string;
  inReplyTo?: string;
  content: string;
  contentType: 'text' | 'html' | 'mixed';
  parsedHeaders: Record<string, any>;
  attachmentCount: number;
  addedAt: string; // ISO timestamp
  addedBy: string; // UUID
  source: 'MANUAL_PASTE' | 'FORWARD' | 'IMPORT' | 'API';
  emailType: EmailType;
  isImportant: boolean;
  archived: boolean;
  archivedAt?: string; // ISO timestamp
  
  // Computed fields
  adderName?: string; // Populated from user data
  shortSubject?: string; // Truncated subject
  previewText?: string; // First 100 chars of content
}

// Interface für Team-Aktivitäten
export interface TeamActivity {
  id: number;
  clarificationId: number;
  teamId: string; // UUID
  userId: string; // UUID
  activityType: ActivityType;
  description: string;
  timestamp: string; // ISO timestamp
  metadata: Record<string, any>;
  archived: boolean;
  
  // Computed fields
  userName?: string; // Populated from user data
  teamName?: string; // Populated from team data
  timeAgo?: string; // "2 hours ago"
}

// Request/Response Interfaces für API

export interface CreateClarificationRequest {
  title: string;
  description?: string;
  marketPartnerCode: string;
  caseType: ClarificationCaseType;
  priority?: ClarificationPriority;
  assignedTo?: string;
  dueDate?: string;
  tags?: string[];
  externalCaseId?: string;
  sourceSystem?: string;
}

export interface UpdateClarificationRequest {
  title?: string;
  description?: string;
  status?: ClarificationStatus;
  priority?: ClarificationPriority;
  assignedTo?: string;
  dueDate?: string;
  resolutionNotes?: string;
  tags?: string[];
  sharedWithTeam?: boolean;
}

export interface ClarificationFilters {
  status?: ClarificationStatus[];
  caseType?: ClarificationCaseType[];
  priority?: ClarificationPriority[];
  assignedTo?: string;
  createdBy?: string;
  marketPartner?: string;
  tags?: string[];
  sharedWithTeam?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string; // Full-text search
  isOverdue?: boolean;
  hasAttachments?: boolean;
}

export interface ClarificationListResponse {
  clarifications: BilateralClarification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totalOpen: number;
    totalInProgress: number;
    totalResolved: number;
    totalClosed: number;
    overdueCases: number;
    highPriorityCases: number;
  };
}

export interface AddNoteRequest {
  content: string;
  noteType?: NoteType;
  isInternal?: boolean;
  linkedAttachmentId?: number;
  linkedEmailId?: number;
  tags?: string[];
  isPinned?: boolean;
}

export interface AddTeamCommentRequest {
  content: string;
  parentCommentId?: number;
  mentionedUsers?: string[];
}

export interface AddEmailRequest {
  direction: EmailDirection;
  subject?: string;
  fromAddress?: string;
  toAddresses?: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
  content: string;
  contentType?: 'text' | 'html' | 'mixed';
  emailType?: EmailType;
  isImportant?: boolean;
  source?: 'MANUAL_PASTE' | 'FORWARD' | 'IMPORT' | 'API';
}

export interface UploadAttachmentRequest {
  file: File;
  attachmentType?: AttachmentType;
  attachmentCategory?: AttachmentCategory;
  description?: string;
  isSensitive?: boolean;
}

// Utility Types für bessere Developer Experience

export interface ClarificationPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
  canShareWithTeam: boolean;
  canAssign: boolean;
  canResolve: boolean;
  canArchive: boolean;
  canViewTeamCases: boolean;
  canViewSensitiveAttachments: boolean;
}

export interface ClarificationStats {
  totalCases: number;
  openCases: number;
  myAssignedCases: number;
  overdueCases: number;
  resolvedThisMonth: number;
  averageResolutionTime: number; // in hours
  teamSharedCases: number;
}

// Market Partner Integration Types (from existing CodeLookup)
export interface MarketPartnerInfo {
  code: string;
  name: string;
  role: string;
  city?: string;
  zipCode?: string;
  street?: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

// AI/LLM Integration Types
export interface AIAnalysisResult {
  problemCategory: string;
  confidence: number;
  suggestedActions: string[];
  regulatoryNotes: string[];
  similarCases: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  nextSteps: string[];
  estimatedResolutionTime?: number; // hours
}

export interface AIGeneratedResponse {
  subject: string;
  content: string;
  tone: 'FORMAL' | 'FRIENDLY' | 'URGENT';
  confidence: number;
  reviewRequired: boolean;
}

// Error Types
export interface ClarificationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ClarificationError[];
  warnings?: ClarificationError[];
}

// Export utility functions types
export type ClarificationSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: ClarificationSortField;
  direction: SortDirection;
}

// Bulk Operations
export interface BulkUpdateRequest {
  clarificationIds: number[];
  updates: Partial<UpdateClarificationRequest>;
}

export interface BulkActionResult {
  successful: number[];
  failed: Array<{
    id: number;
    error: string;
  }>;
}

// Export/Import Types
export interface ExportOptions {
  format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON';
  includeAttachments: boolean;
  includeNotes: boolean;
  includeComments: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}
