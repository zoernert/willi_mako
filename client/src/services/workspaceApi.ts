import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { WorkspaceSettings, SearchResult, SearchRequest, ContextResponse } from '../types/workspace';

export const workspaceApi = {
  // Get workspace settings
  getSettings: (): Promise<WorkspaceSettings> => {
    return apiClient.get(API_ENDPOINTS.workspace.settings);
  },

  // Get workspace dashboard data (stats, usage, etc.)
  getDashboard: (): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.workspace.dashboard);
  },

  // Get storage usage information
  getStorageUsage: (): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.workspace.storage);
  },

  // Clean up unused storage
  cleanupStorage: (): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.workspace.cleanup);
  },

  // Export user workspace data
  exportData: (): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.workspace.export);
  },

  // Update workspace settings
  updateSettings: (settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> => {
    return apiClient.put(API_ENDPOINTS.workspace.settings, settings);
  },

  // Delete all workspace data
  deleteAllData: (): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.workspace.deleteData);
  },

  // Global search across documents, notes, and chats
  search: (searchRequest: SearchRequest): Promise<SearchResult[]> => {
    return apiClient.post(API_ENDPOINTS.workspace.search, searchRequest);
  },

  // Simple search with query parameter
  searchSimple: (query: string): Promise<SearchResult[]> => {
    return apiClient.get(`${API_ENDPOINTS.workspace.search}?q=${encodeURIComponent(query)}`);
  },

  // Get relevant context for current workspace
  getContext: (query?: string): Promise<ContextResponse> => {
    const params = query ? { query } : {};
    return apiClient.get(API_ENDPOINTS.workspace.context, { params });
  },
};
