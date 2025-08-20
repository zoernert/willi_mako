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
  AttachmentType,
  ChatContext,
  MessageAnalyzerContext,
  ClarificationContext
} from '../types/bilateral';
import { EmailData } from '../components/BilateralClarifications/EmailComposerDialog';
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
      // Sicherstellen, dass marketPartner-Daten vollständig sind
      if (clarificationData.marketPartner) {
        // Sicherstellen, dass die erforderlichen Eigenschaften vorhanden sind
        if (!clarificationData.marketPartner.code) {
          console.error('Fehler: marketPartner.code fehlt in den Daten');
          throw new Error('Fehler: Marktpartner-Code fehlt');
        }
        
        if (!clarificationData.marketPartner.companyName) {
          // Falls companyName fehlt, versuchen wir einen Fallback-Wert zu setzen
          clarificationData.marketPartner.companyName = 'Unbekannter Marktpartner';
          console.warn('Warnung: marketPartner.companyName wurde auf Fallback-Wert gesetzt');
        }
        
        // Weitere erforderliche Eigenschaften setzen, falls sie fehlen
        if (!clarificationData.marketPartner.codeType) {
          clarificationData.marketPartner.codeType = 'bdew';
        }
        
        // Debug-Ausgabe
        console.log('MarketPartner-Daten für die API-Anfrage:', clarificationData.marketPartner);
      }
      
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

  // Context Transfer Methods für Integration mit Chat und MessageAnalyzer
  async createFromChatContext(
    chatContext: ChatContext,
    clarificationData: Partial<BilateralClarification>
  ): Promise<BilateralClarification> {
    try {
      // Stellen Sie sicher, dass die chatId korrekt übergeben wird
      if (!chatContext.chatId) {
        console.error('Chat context is missing chatId');
        throw new Error('Chat-ID fehlt - kann keine Klärung erstellen');
      }
      
      console.log('Creating clarification from chat context with ID:', chatContext.chatId);
      
      const response = await apiClient.post(`${BILATERAL_BASE}/from-chat-context`, {
        context: {
          source: 'chat',
          chatContext,
          ...this.extractContextData(chatContext.content, 'chat')
        },
        clarification: clarificationData
      });
      return response as BilateralClarification;
    } catch (error) {
      console.error('Error creating clarification from chat context:', error);
      throw error;
    }
  }

  async createFromMessageAnalyzerContext(
    messageAnalyzerContext: MessageAnalyzerContext,
    clarificationData: Partial<BilateralClarification>
  ): Promise<BilateralClarification> {
    try {
      const response = await apiClient.post(`${BILATERAL_BASE}/from-analyzer-context`, {
        context: {
          source: 'message_analyzer',
          messageAnalyzerContext,
          ...this.extractContextData(messageAnalyzerContext.originalMessage, 'analyzer', messageAnalyzerContext.analysisResult)
        },
        clarification: clarificationData
      });
      return response as BilateralClarification;
    } catch (error) {
      console.error('Error creating clarification from message analyzer context:', error);
      throw error;
    }
  }

  /**
   * Extract context data for auto-filling clarification form
   */
  private extractContextData(
    content: string, 
    source: 'chat' | 'analyzer',
    analysisResult?: any
  ): Partial<ClarificationContext> {
    const extracted: Partial<ClarificationContext> = {};

    // Extract market partner codes (BDEW/EIC pattern)
    const marketPartnerRegex = /\b([0-9]{13}|[0-9]{16})\b/g;
    const marketPartnerMatches = content.match(marketPartnerRegex);
    if (marketPartnerMatches) {
      extracted.suggestedMarketPartner = {
        code: marketPartnerMatches[0],
        name: 'Auto-erkannt' // Will be resolved via CodeLookup
      };
    }

    // Extract EDIFACT message types
    const edifactRegex = /\b(APERAK|UTILMD|MSCONS|ORDERS|INVOIC|PRICAT|ORDRSP)\b/i;
    const edifactMatch = content.match(edifactRegex);
    if (edifactMatch) {
      extracted.edifactMessageType = edifactMatch[0].toUpperCase() as any;
    }

    // Extract problem types based on keywords
    if (content.toLowerCase().includes('stammdaten') || content.toLowerCase().includes('maloid')) {
      extracted.problemType = 'stammdaten';
      extracted.suggestedCaseType = 'TECHNICAL';
    } else if (content.toLowerCase().includes('messwert') || content.toLowerCase().includes('zählerstand')) {
      extracted.problemType = 'messwerte';
      extracted.suggestedCaseType = 'TECHNICAL';
    } else if (content.toLowerCase().includes('prozess') || content.toLowerCase().includes('anmeldung')) {
      extracted.problemType = 'prozess';
      extracted.suggestedCaseType = 'B2B';
    }

    // Priority based on urgency keywords
    if (content.toLowerCase().includes('dringend') || content.toLowerCase().includes('kritisch')) {
      extracted.suggestedPriority = 'HIGH';
    } else if (content.toLowerCase().includes('eilig')) {
      extracted.suggestedPriority = 'MEDIUM';
    } else {
      extracted.suggestedPriority = 'MEDIUM';
    }

    // Generate suggested title and description
    if (source === 'analyzer' && analysisResult) {
      extracted.suggestedTitle = `${extracted.edifactMessageType || 'EDIFACT'}-Klärung: ${analysisResult.summary?.substring(0, 50) || 'Nachrichtenanalyse'}`;
      extracted.suggestedDescription = `Automatisch erstellt aus Nachrichten-Analyse:\n\n${analysisResult.summary || ''}\n\nOriginal-Nachricht:\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`;
    } else {
      // Chat context
      const firstLine = content.split('\n')[0] || '';
      const preview = firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
      extracted.suggestedTitle = `Chat-basierte Klärung: ${preview}`;
      
      // Nur einen Hinweis setzen, dass eine ausführliche Zusammenfassung erstellt wird
      extracted.suggestedDescription = `Automatisch erstellt aus Chat-Konversation.\n\nEs wird eine KI-generierte Zusammenfassung erstellt...\n\n---\nAuszug aus dem Chat:\n${content.substring(0, 300)}${content.length > 300 ? '...' : ''}`;
    }

    return extracted;
  }

  /**
   * Email-Funktionalität für bilaterale Klärungen
   */
  async sendClarificationEmail(
    clarificationId: number, 
    emailData: EmailData
  ): Promise<{ success: boolean; messageId?: string; sentAt: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; messageId?: string; sentAt: string }>(
        `${BILATERAL_BASE}/${clarificationId}/send-email`,
        emailData
      );
      return response;
    } catch (error) {
      console.error('Error sending clarification email:', error);
      throw error;
    }
  }

  async validateMarketPartnerEmail(
    marketPartnerCode: string,
    role: string
  ): Promise<{ isValid: boolean; email?: string; contactName?: string }> {
    try {
      const response = await apiClient.get<{ isValid: boolean; email?: string; contactName?: string }>(
        `${BILATERAL_BASE}/validate-email`,
        { params: { marketPartnerCode, role } }
      );
      return response;
    } catch (error) {
      console.error('Error validating market partner email:', error);
      throw error;
    }
  }

  async updateClarificationStatus(
    clarificationId: number,
    status: ClarificationStatus,
    internalStatus?: string,
    reason?: string
  ): Promise<BilateralClarification> {
    try {
      const response = await apiClient.patch<BilateralClarification>(
        `${BILATERAL_BASE}/${clarificationId}/status`,
        { status, internalStatus, reason }
      );
      return response;
    } catch (error) {
      console.error('Error updating clarification status:', error);
      throw error;
    }
  }

  async getEmailHistory(clarificationId: number): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(
        `${BILATERAL_BASE}/${clarificationId}/emails`
      );
      return response;
    } catch (error) {
      console.error('Error fetching email history:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const bilateralClarificationService = new BilateralClarificationService();
export default bilateralClarificationService;
