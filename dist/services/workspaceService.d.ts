import { UserWorkspaceSettings, StorageInfo, WorkspaceDashboard, UserDocument } from '../types/workspace';
export declare class WorkspaceService {
    private notesService;
    private documentProcessor;
    private qdrantService;
    private teamService;
    constructor();
    getUserWorkspaceSettings(userId: string): Promise<UserWorkspaceSettings>;
    updateWorkspaceSettings(userId: string, settings: Partial<UserWorkspaceSettings>): Promise<UserWorkspaceSettings>;
    getStorageUsage(userId: string): Promise<StorageInfo>;
    checkStorageLimit(userId: string, additionalSize: number): Promise<boolean>;
    getWorkspaceDashboard(userId: string): Promise<WorkspaceDashboard>;
    private createDefaultSettings;
    getWorkspaceStats(): Promise<{
        total_users_with_workspace: number;
        total_documents: number;
        total_notes: number;
        total_storage_used_mb: number;
        average_storage_per_user: number;
        ai_context_enabled_users: number;
    }>;
    cleanupStorage(userId: string): Promise<{
        cleaned_files: number;
        freed_mb: number;
    }>;
    exportUserData(userId: string): Promise<{
        notes: any[];
        documents: any[];
        settings: any;
    }>;
    deleteUserData(userId: string): Promise<void>;
    getUserDocuments(userId: string, filters?: {
        tags?: string[];
        is_processed?: boolean;
        is_ai_context_enabled?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<UserDocument[]>;
    getDocumentById(documentId: string, userId: string): Promise<UserDocument | null>;
    updateDocument(documentId: string, userId: string, updates: {
        title?: string;
        description?: string;
        tags?: string[];
        is_ai_context_enabled?: boolean;
    }): Promise<UserDocument>;
    deleteDocument(documentId: string, userId: string): Promise<void>;
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
    getAIContextDocuments(userId: string): Promise<UserDocument[]>;
    updateStorageUsage(userId: string, sizeDeltaBytes: number): Promise<void>;
    searchWorkspaceContent(userId: string, query: string, type?: 'all' | 'documents' | 'notes', limit?: number): Promise<any[]>;
    private truncateText;
    getTeamWorkspaceDocuments(userId: string): Promise<UserDocument[]>;
    searchTeamWorkspaceContent(userId: string, query: string, type?: 'all' | 'documents' | 'notes', filters?: {
        scope?: 'own' | 'team' | 'all';
    }, limit?: number): Promise<any[]>;
    private getTeamMemberIds;
    getTeamWorkspaceDashboard(userId: string): Promise<WorkspaceDashboard & {
        team_info?: {
            name: string;
            member_count: number;
            is_admin: boolean;
        };
        team_documents_count?: number;
        team_recent_documents?: any[];
    }>;
    getUserDocument(userId: string, documentId: string): Promise<UserDocument | null>;
}
//# sourceMappingURL=workspaceService.d.ts.map