// Frontend Service für Bilaterale Klärfälle API-Kommunikation
// Erstellt: 12. August 2025
// Beschreibung: Service-Klasse für alle API-Calls zum Bilateral Clarification System

import axios, { AxiosResponse } from 'axios';
import { 
  BilateralClarification, 
  CreateClarificationRequest, 
  UpdateClarificationRequest,
  ClarificationFilters,
  ClarificationListResponse,
  TeamComment,
  ClarificationNote,
  ClarificationAttachment,
  AddNoteRequest,
  AddTeamCommentRequest
} from '../types/bilateral';

// API Base Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const BILATERAL_BASE = `${API_BASE_URL}/bilateral-clarifications`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Bilateral Clarification Service Class
 */
export class BilateralClarificationService {
  
  async getClarifications(
    filters?: ClarificationFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ClarificationListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      const response: AxiosResponse<ClarificationListResponse> = 
        await apiClient.get(`${BILATERAL_BASE}?${params}`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching clarifications:', error);
      throw new Error('Fehler beim Laden der Klärfälle');
    }
  }

  async getById(id: string): Promise<BilateralClarification> {
    try {
      const response: AxiosResponse<BilateralClarification> = 
        await apiClient.get(`${BILATERAL_BASE}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching clarification:', error);
      throw new Error('Fehler beim Laden des Klärfalls');
    }
  }

  async create(clarificationData: CreateClarificationRequest): Promise<BilateralClarification> {
    try {
      const response: AxiosResponse<BilateralClarification> = 
        await apiClient.post(BILATERAL_BASE, clarificationData);
      return response.data;
    } catch (error) {
      console.error('Error creating clarification:', error);
      throw new Error('Fehler beim Erstellen des Klärfalls');
    }
  }

  async update(id: string, updateData: UpdateClarificationRequest): Promise<BilateralClarification> {
    try {
      const response: AxiosResponse<BilateralClarification> = 
        await apiClient.put(`${BILATERAL_BASE}/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating clarification:', error);
      throw new Error('Fehler beim Aktualisieren des Klärfalls');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BILATERAL_BASE}/${id}`);
    } catch (error) {
      console.error('Error deleting clarification:', error);
      throw new Error('Fehler beim Löschen des Klärfalls');
    }
  }

  async getNotes(clarificationId: string): Promise<ClarificationNote[]> {
    try {
      const response: AxiosResponse<ClarificationNote[]> = 
        await apiClient.get(`${BILATERAL_BASE}/${clarificationId}/notes`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }

  async addNote(clarificationId: string, noteData: AddNoteRequest): Promise<ClarificationNote> {
    try {
      const response: AxiosResponse<ClarificationNote> = 
        await apiClient.post(`${BILATERAL_BASE}/${clarificationId}/notes`, noteData);
      return response.data;
    } catch (error) {
      console.error('Error adding note:', error);
      throw new Error('Fehler beim Hinzufügen der Notiz');
    }
  }

  async getAttachments(clarificationId: string): Promise<ClarificationAttachment[]> {
    try {
      const response: AxiosResponse<ClarificationAttachment[]> = 
        await apiClient.get(`${BILATERAL_BASE}/${clarificationId}/attachments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attachments:', error);
      return [];
    }
  }

  async uploadAttachment(clarificationId: string, file: File): Promise<ClarificationAttachment> {
    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const response: AxiosResponse<ClarificationAttachment> = 
        await apiClient.post(
          `${BILATERAL_BASE}/${clarificationId}/attachments`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      return response.data;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw new Error('Fehler beim Hochladen des Anhangs');
    }
  }

  async downloadAttachment(attachmentId: string): Promise<void> {
    try {
      const response = await apiClient.get(`${BILATERAL_BASE}/attachments/${attachmentId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw new Error('Fehler beim Herunterladen des Anhangs');
    }
  }

  async getTeamComments(clarificationId: string): Promise<TeamComment[]> {
    try {
      const response: AxiosResponse<TeamComment[]> = 
        await apiClient.get(`${BILATERAL_BASE}/${clarificationId}/team-comments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team comments:', error);
      return [];
    }
  }

  async addTeamComment(clarificationId: string, commentData: AddTeamCommentRequest): Promise<TeamComment> {
    try {
      const response: AxiosResponse<TeamComment> = 
        await apiClient.post(`${BILATERAL_BASE}/${clarificationId}/team-comments`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error adding team comment:', error);
      throw new Error('Fehler beim Hinzufügen des Team-Kommentars');
    }
  }

  async shareWithTeam(clarificationId: string): Promise<void> {
    try {
      await apiClient.post(`${BILATERAL_BASE}/${clarificationId}/share`);
    } catch (error) {
      console.error('Error sharing with team:', error);
      throw new Error('Fehler beim Teilen mit dem Team');
    }
  }

  async unshareFromTeam(clarificationId: string): Promise<void> {
    try {
      await apiClient.post(`${BILATERAL_BASE}/${clarificationId}/unshare`);
    } catch (error) {
      console.error('Error unsharing from team:', error);
      throw new Error('Fehler beim Entziehen der Team-Freigabe');
    }
  }

  async getStats(): Promise<any> {
    const response: AxiosResponse = await apiClient.get(`${BILATERAL_BASE}/stats`);
    return response.data;
  }

  /**
   * Export clarifications to various formats
   */
  async exportClarifications(filters?: ClarificationFilters, format: 'xlsx' | 'csv' | 'pdf' = 'xlsx'): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    params.append('format', format);
    
    const response = await apiClient.get(`${BILATERAL_BASE}/export?${params.toString()}`, {
      responseType: 'blob',
    });
    
    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bilateral-clarifications-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

}

// Export singleton instance
export const bilateralClarificationService = new BilateralClarificationService();
export default bilateralClarificationService;
