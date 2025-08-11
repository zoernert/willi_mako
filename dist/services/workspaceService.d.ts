import { UserWorkspaceSettings, StorageInfo, WorkspaceDashboard, UserDocument } from '../types/workspace';
export declare class WorkspaceService {
    private notesService;
    private documentProcessor;
    private qdrantService;
    private teamService;
    constructor();
    /**
     * Get user workspace settings
     */
    getUserWorkspaceSettings(userId: string): Promise<UserWorkspaceSettings>;
    /**
     * Update workspace settings
     */
    updateWorkspaceSettings(userId: string, settings: Partial<UserWorkspaceSettings>): Promise<UserWorkspaceSettings>;
    /**
     * Get storage usage information
     */
    getStorageUsage(userId: string): Promise<StorageInfo>;
    /**
     * Check if user has enough storage space
     */
    checkStorageLimit(userId: string, additionalSize: number): Promise<boolean>;
    /**
     * Get workspace dashboard data
     */
    getWorkspaceDashboard(userId: string): Promise<WorkspaceDashboard>;
    /**
     * Create default workspace settings for a user
     */
    private createDefaultSettings;
    /**
     * Get workspace statistics for admin
     */
    getWorkspaceStats(): Promise<{
        total_users_with_workspace: number;
        total_documents: number;
        total_notes: number;
        total_storage_used_mb: number;
        average_storage_per_user: number;
        ai_context_enabled_users: number;
    }>;
    /**
     * Clean up unused storage (remove orphaned files)
     */
    cleanupStorage(userId: string): Promise<{
        cleaned_files: number;
        freed_mb: number;
    }>;
    /**
     * Export user workspace data
     */
    exportUserData(userId: string): Promise<{
        notes: any[];
        documents: any[];
        settings: any;
    }>;
    /**
     * Delete all user workspace data
     */
    deleteUserData(userId: string): Promise<void>;
    /**
     * Get user documents with filters
     */
    getUserDocuments(userId: string, filters?: {
        tags?: string[];
        is_processed?: boolean;
        is_ai_context_enabled?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<UserDocument[]>;
    /**
     * Get document by ID
     */
    getDocumentById(documentId: string, userId: string): Promise<UserDocument | null>;
    /**
     * Update document
     */
    updateDocument(documentId: string, userId: string, updates: {
        title?: string;
        description?: string;
        tags?: string[];
        is_ai_context_enabled?: boolean;
    }): Promise<UserDocument>;
    /**
     * Delete document
     */
    deleteDocument(documentId: string, userId: string): Promise<void>;
    /**
     * Create document record
     */
    createDocument(userId: string, data: {
        title: string;
        description?: string;
        file_path: string;
        file_size: number;
        mime_type: string;
        original_name: string;
        tags?: string[];
        is_ai_context_enabled?: boolean;
    }): Promise<UserDocument>;
    /**
     * Get documents that are AI-context enabled for a user
     */
    getAIContextDocuments(userId: string): Promise<UserDocument[]>;
    /**
     * Update storage usage (called after file operations)
     */
    updateStorageUsage(userId: string, sizeDeltaBytes: number): Promise<void>;
    /**
     * Search across user's workspace content (notes and documents)
     */
    searchWorkspaceContent(userId: string, query: string, type?: 'all' | 'documents' | 'notes', limit?: number): Promise<any[]>;
    /**
     * Helper method to truncate text for snippets
     */
    private truncateText;
    /**
     * Team Workspace Methods
     */
    /**
     * Get workspace documents including team members' documents
     */
    getTeamWorkspaceDocuments(userId: string): Promise<UserDocument[]>;
    /**
     * Search workspace content across team documents
     */
    searchTeamWorkspaceContent(userId: string, query: string, type?: 'all' | 'documents' | 'notes', filters?: {
        scope?: 'own' | 'team' | 'all';
    }, limit?: number): Promise<any[]>;
    /**
     * Get team member IDs including the user themselves
     */
    private getTeamMemberIds;
    /**
     * Get team workspace dashboard data
     */
    getTeamWorkspaceDashboard(userId: string): Promise<WorkspaceDashboard & {
        team_info?: {
            name: string;
            member_count: number;
            is_admin: boolean;
        };
        team_documents_count?: number;
        team_recent_documents?: any[];
    }>;
    /**
     * Get a single document by ID for the user
     */
    getUserDocument(userId: string, documentId: string): Promise<UserDocument | null>;
}
//# sourceMappingURL=workspaceService.d.ts.map