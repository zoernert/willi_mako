import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { Document, UploadResponse } from '../types/workspace';

interface UploadMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  is_ai_context_enabled?: boolean;
}

export const documentsApi = {
  // Get all documents
  getDocuments: (): Promise<Document[]> => {
    return apiClient.get(API_ENDPOINTS.documents.list);
  },

  // Upload a document
  uploadDocument: (file: File, metadata?: UploadMetadata): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.description) formData.append('description', metadata.description);
    if (metadata?.tags) formData.append('tags', JSON.stringify(metadata.tags));
    if (metadata?.is_ai_context_enabled !== undefined) {
      formData.append('is_ai_context_enabled', String(metadata.is_ai_context_enabled));
    }
    
    return apiClient.post(API_ENDPOINTS.documents.upload, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload document with progress tracking
  uploadDocumentWithProgress: (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 80); // Reserve 80% for upload, 20% for processing
          onProgress(progress);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Upload failed'));
      };

      const token = localStorage.getItem('token');
      xhr.open('POST', API_ENDPOINTS.documents.upload);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },

  // Upload multiple documents
  uploadMultipleDocuments: (files: File[], metadata?: { is_ai_context_enabled?: boolean }): Promise<UploadResponse[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (metadata?.is_ai_context_enabled !== undefined) {
      formData.append('is_ai_context_enabled', String(metadata.is_ai_context_enabled));
    }
    
    return apiClient.post(API_ENDPOINTS.documents.uploadMultiple, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get document by ID
  getDocument: (documentId: string): Promise<Document> => {
    return apiClient.get(API_ENDPOINTS.documents.detail(documentId));
  },

  // Get document preview (returns blob)
  getDocumentPreview: async (documentId: string): Promise<Blob> => {
    const response = await fetch(`${apiClient.getBaseURL()}${API_ENDPOINTS.documents.preview(documentId)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load document preview');
    }

    return response.blob();
  },

  // Download document (returns blob)
  downloadDocument: async (documentId: string): Promise<Blob> => {
    const response = await fetch(`${apiClient.getBaseURL()}${API_ENDPOINTS.documents.download(documentId)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return response.blob();
  },

  // Delete a document
  deleteDocument: (documentId: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.documents.delete(documentId));
  },

  // Update document metadata
  updateDocument: (documentId: string, data: Partial<Document>): Promise<Document> => {
    return apiClient.put(API_ENDPOINTS.documents.update(documentId), data);
  },

  // Reprocess document
  reprocessDocument: (documentId: string): Promise<void> => {
    return apiClient.post(API_ENDPOINTS.documents.reprocess(documentId));
  },

  // Get workspace documents with filters
  getWorkspaceDocuments: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    processed?: boolean;
  }): Promise<{documents: Document[], total: number, page: number, totalPages: number}> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.processed !== undefined) searchParams.set('processed', params.processed.toString());
    
    const url = `${API_ENDPOINTS.documents.list}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiClient.get(url);
  },

  // Toggle AI context for document
  toggleAIContext: (documentId: string, enabled: boolean): Promise<Document> => {
    return apiClient.post(`/api/workspace/documents/${documentId}/ai-context`, { enabled });
  },
};
