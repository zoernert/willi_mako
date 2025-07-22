import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { Note, SearchResult } from '../types/workspace';

export const notesApi = {
  // Get all notes with optional filtering and pagination
  getNotes: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    source_type?: string;
  }): Promise<{notes: Note[], total: number}> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tags?.length) searchParams.set('tags', params.tags.join(','));
    if (params?.source_type && params.source_type !== 'all') searchParams.set('source_type', params.source_type);
    
    const url = `${API_ENDPOINTS.notes.list}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiClient.get(url);
  },

  // Get available tags
  getAvailableTags: (): Promise<string[]> => {
    return apiClient.get(API_ENDPOINTS.notes.tags);
  },

  // Get available tags (alias for compatibility)
  getTags: (): Promise<{tags: string[]}> => {
    return apiClient.get(API_ENDPOINTS.notes.tags).then((tags) => ({ tags: tags as string[] }));
  },

  // Create a new note
  createNote: (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Note> => {
    return apiClient.post(API_ENDPOINTS.notes.create, noteData);
  },

  // Update a note
  updateNote: (noteId: string, noteData: Partial<Note>): Promise<Note> => {
    return apiClient.put(API_ENDPOINTS.notes.update(noteId), noteData);
  },

  // Delete a note
  deleteNote: (noteId: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.notes.delete(noteId));
  },

  // Search notes
  searchNotes: (query: string): Promise<SearchResult[]> => {
    return apiClient.get(API_ENDPOINTS.notes.search, { 
      params: { query } 
    });
  },
};
