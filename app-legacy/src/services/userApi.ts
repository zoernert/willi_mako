import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { User, UserProfile, UserPreferences, FlipModePreferences } from '../types/user';

// M2C Role interfaces
export interface M2CRole {
  id: string;
  role_name: string;
  short_description: string;
  detailed_description?: string;
}

export interface UserM2CRoleSelection {
  roleIds: string[];
  roles: M2CRole[];
}

export const userApi = {
  getUserProfile: (): Promise<User> => {
    return apiClient.get(API_ENDPOINTS.user.profile);
  },
  updateUserProfile: (profileData: Partial<UserProfile>): Promise<User> => {
    return apiClient.put(API_ENDPOINTS.user.profile, profileData);
  },
  getUserPreferences: (): Promise<UserPreferences> => {
    return apiClient.get(API_ENDPOINTS.user.preferences);
  },
  updateUserPreferences: (preferencesData: Partial<UserPreferences>): Promise<UserPreferences> => {
    return apiClient.put(API_ENDPOINTS.user.preferences, preferencesData);
  },
  getFlipModePreferences: (): Promise<FlipModePreferences> => {
    return apiClient.get(API_ENDPOINTS.user.flipModePreferences);
  },
  updateFlipModePreferences: (preferencesData: Partial<FlipModePreferences>): Promise<FlipModePreferences> => {
    return apiClient.put(API_ENDPOINTS.user.flipModePreferences, preferencesData);
  },
  
  // AI key management (per-user Gemini key)
  getAIKeyStatus: (): Promise<{ hasKey: boolean; status: 'unknown'|'valid'|'invalid'; lastVerifiedAt: string | null; systemKeyAllowed?: boolean }> => {
    return apiClient.get('/v2/user/ai-key/status');
  },
  setAIKey: (apiKey: string): Promise<{ status: 'unknown'|'valid'|'invalid'; lastVerifiedAt: string | null }> => {
    return apiClient.put('/v2/user/ai-key', { apiKey });
  },
  deleteAIKey: (): Promise<{ deleted: boolean }> => {
    return apiClient.delete('/v2/user/ai-key');
  },
  
  // M2C Roles methods
  getAllM2CRoles: (): Promise<M2CRole[]> => {
    return apiClient.get('/m2c-roles');
  },
  
  getUserM2CRoles: (): Promise<UserM2CRoleSelection> => {
    return apiClient.get('/users/me/m2c-roles');
  },
  
  updateUserM2CRoles: (roleIds: string[]): Promise<{ roleIds: string[] }> => {
    return apiClient.put('/users/me/m2c-roles', { roleIds });
  },
};
