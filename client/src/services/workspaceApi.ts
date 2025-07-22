import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { WorkspaceSettings, SearchResult, SearchRequest, ContextResponse } from '../types/workspace';

export const workspaceApi = {
  // Get workspace settings
  getSettings: (): Promise<WorkspaceSettings> => {
    return apiClient.get(API_ENDPOINTS.workspace.settings);
  },

  // Update workspace settings
  updateSettings: (settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> => {
    return apiClient.put(API_ENDPOINTS.workspace.settings, settings);
  },

  // Delete all workspace data
  deleteAllData: (): Promise<void> => {
    return apiClient.delete('/api/workspace/delete-all');
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
