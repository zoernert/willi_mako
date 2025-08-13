// Frontend Service für Bilaterale Klärfälle API-Kommunikation
// Erstellt: 12. August 2025
// Beschreibung: Service-Klasse für alle API-Calls zum Bilateral Clarification System

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
  AddTeamCommentRequest,
  ClarificationStatus,
  AttachmentType
} from '../types/bilateral';
import apiClient from './apiClient';

// API Base Configuration
const BILATERAL_BASE = `/bilateral-clarifications`;

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

      // Add filters to params if provided
      if (filters?.status?.length) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters?.priority?.length) {
        filters.priority.forEach(priority => params.append('priority', priority));
      }
      if (filters?.caseType?.length) {
        filters.caseType.forEach(type => params.append('caseType', type));
      }
      if (filters?.marketPartner) params.append('marketPartner', filters.marketPartner);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.sharedWithTeam !== undefined) params.append('sharedWithTeam', filters.sharedWithTeam.toString());
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters?.createdBy) params.append('createdBy', filters.createdBy);
      if (filters?.isOverdue !== undefined) params.append('isOverdue', filters.isOverdue.toString());
      if (filters?.hasAttachments !== undefined) params.append('hasAttachments', filters.hasAttachments.toString());
      if (filters?.dateRange) {
        params.append('dateStart', filters.dateRange.start);
        params.append('dateEnd', filters.dateRange.end);
      }
      if (filters?.tags?.length) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }

      const data = await apiClient.get<ClarificationListResponse>(`${BILATERAL_BASE}?${params}`);
      return data;
    } catch (error) {
      console.error('Error fetching clarifications:', error);
      throw new Error('Fehler beim Laden der Klärfälle');
    }
  }

  async getById(id: string): Promise<BilateralClarification> {
    try {
      const data = await apiClient.get<BilateralClarification>(`${BILATERAL_BASE}/${id}`);
      return data;
    } catch (error) {
      console.error('Error fetching clarification:', error);
      throw new Error('Fehler beim Laden des Klärfalls');
    }
  }

  async create(clarificationData: CreateClarificationRequest): Promise<BilateralClarification> {
    try {
      const data = await apiClient.post<BilateralClarification>(BILATERAL_BASE, clarificationData);
      return data;
    } catch (error) {
      console.error('Error creating clarification:', error);
      throw new Error('Fehler beim Erstellen des Klärfalls');
    }
  }

  async update(id: string, updateData: UpdateClarificationRequest): Promise<BilateralClarification> {
    try {
      const data = await apiClient.put<BilateralClarification>(`${BILATERAL_BASE}/${id}`, updateData);
      return data;
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

  // Attachment Management
  async getAttachments(clarificationId: string): Promise<ClarificationAttachment[]> {
    try {
      const data = await apiClient.get<ClarificationAttachment[]>(`${BILATERAL_BASE}/${clarificationId}/attachments`);
      return data;
    } catch (error) {
      console.error('Error fetching attachments:', error);
      return [];
    }
  }

  async uploadAttachment(clarificationId: string, file: File): Promise<ClarificationAttachment> {
    try {
      const data = await apiClient.uploadFile<ClarificationAttachment>(
        `${BILATERAL_BASE}/${clarificationId}/attachments`,
        file
      );
      return data;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw new Error('Fehler beim Hochladen des Anhangs');
    }
  }

  async downloadAttachment(attachmentId: string): Promise<Blob> {
    try {
      const response = await apiClient.get<Blob>(`${BILATERAL_BASE}/attachments/${attachmentId}/download`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw new Error('Fehler beim Download des Anhangs');
    }
  }

  // Team Comments
  async getTeamComments(clarificationId: string): Promise<TeamComment[]> {
    try {
      const data = await apiClient.get<TeamComment[]>(`${BILATERAL_BASE}/${clarificationId}/team-comments`);
      return data;
    } catch (error) {
      console.error('Error fetching team comments:', error);
      return [];
    }
  }

  async addTeamComment(clarificationId: string, commentData: AddTeamCommentRequest): Promise<TeamComment> {
    try {
      const data = await apiClient.post<TeamComment>(`${BILATERAL_BASE}/${clarificationId}/team-comments`, commentData);
      return data;
    } catch (error) {
      console.error('Error adding team comment:', error);
      throw new Error('Fehler beim Hinzufügen des Team-Kommentars');
    }
  }

  // Notes Management
  async getNotes(clarificationId: string): Promise<ClarificationNote[]> {
    try {
      const data = await apiClient.get<ClarificationNote[]>(`${BILATERAL_BASE}/${clarificationId}/notes`);
      return data;
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }

  async addNote(clarificationId: string, noteData: AddNoteRequest): Promise<ClarificationNote> {
    try {
      const data = await apiClient.post<ClarificationNote>(`${BILATERAL_BASE}/${clarificationId}/notes`, noteData);
      return data;
    } catch (error) {
      console.error('Error adding note:', error);
      throw new Error('Fehler beim Hinzufügen der Notiz');
    }
  }

  async updateNote(noteId: string, content: string): Promise<ClarificationNote> {
    try {
      const data = await apiClient.put<ClarificationNote>(`${BILATERAL_BASE}/notes/${noteId}`, { content });
      return data;
    } catch (error) {
      console.error('Error updating note:', error);
      throw new Error('Fehler beim Aktualisieren der Notiz');
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      await apiClient.delete(`${BILATERAL_BASE}/notes/${noteId}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw new Error('Fehler beim Löschen der Notiz');
    }
  }

  // Team Sharing
  async shareWithTeam(clarificationId: string): Promise<BilateralClarification> {
    try {
      const data = await apiClient.post<BilateralClarification>(`${BILATERAL_BASE}/${clarificationId}/share`);
      return data;
    } catch (error) {
      console.error('Error sharing with team:', error);
      throw new Error('Fehler beim Freigeben für das Team');
    }
  }

  async unshareFromTeam(clarificationId: string): Promise<BilateralClarification> {
    try {
      const data = await apiClient.post<BilateralClarification>(`${BILATERAL_BASE}/${clarificationId}/unshare`);
      return data;
    } catch (error) {
      console.error('Error unsharing from team:', error);
      throw new Error('Fehler beim Entziehen der Team-Freigabe');
    }
  }

  // Status Management
  async updateStatus(clarificationId: string, status: ClarificationStatus, notes?: string): Promise<BilateralClarification> {
    try {
      const data = await apiClient.put<BilateralClarification>(`${BILATERAL_BASE}/${clarificationId}/status`, { 
        status, 
        notes 
      });
      return data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw new Error('Fehler beim Aktualisieren des Status');
    }
  }

  // Export functionality
  async exportClarifications(filters?: ClarificationFilters, format: 'csv' | 'excel' = 'csv'): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (filters?.status?.length) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters?.priority?.length) {
        filters.priority.forEach(priority => params.append('priority', priority));
      }
      params.append('format', format);

      // For downloads, we'll need to handle this differently
      const url = `${apiClient.getBaseURL()}${BILATERAL_BASE}/export?${params}`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bilateral-clarifications-export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting clarifications:', error);
      throw new Error('Fehler beim Exportieren der Klärfälle');
    }
  }

  // Statistics
  async getStatistics(): Promise<any> {
    try {
      const data = await apiClient.get<any>(`${BILATERAL_BASE}/statistics`);
      return data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new Error('Fehler beim Laden der Statistiken');
    }
  }
}

// Export singleton instance
export const bilateralClarificationService = new BilateralClarificationService();
export default bilateralClarificationService;
