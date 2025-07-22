import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { User, UserProfile, UserPreferences } from '../types/user';

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
};
