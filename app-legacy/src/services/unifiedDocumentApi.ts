import { notesApi } from './notesApi';
import { documentsApi } from './documentsApi';
import { 
  UnifiedDocument, 
  UnifiedDocumentFilters, 
  UnifiedDocumentStats,
  noteToUnifiedDocument,
  documentToUnifiedDocument,
  unifiedDocumentToNote,
  unifiedDocumentToDocument
} from '../types/unifiedDocument';
import { Note, Document } from '../types/workspace';

export const unifiedDocumentApi = {
  // Get all documents (notes + files) with filtering
  getUnifiedDocuments: async (filters?: UnifiedDocumentFilters & {
    page?: number;
    limit?: number;
  }): Promise<{
    documents: UnifiedDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    try {
      const promises: Promise<any>[] = [];
      
      // Fetch notes if type allows
      if (!filters?.type || filters.type === 'all' || filters.type === 'note') {
        promises.push(
          notesApi.getNotes({
            page: filters?.page,
            limit: filters?.limit,
            search: filters?.search,
            tags: filters?.tags,
            source_type: filters?.source_type
          }).catch(() => ({ notes: [], total: 0 }))
        );
      } else {
        promises.push(Promise.resolve({ notes: [], total: 0 }));
      }
      
      // Fetch documents if type allows
      if (!filters?.type || filters.type === 'all' || filters.type === 'file') {
        promises.push(
          documentsApi.getWorkspaceDocuments({
            page: filters?.page,
            limit: filters?.limit,
            search: filters?.search
          }).catch(() => ({ documents: [], total: 0, page: 1, totalPages: 0 }))
        );
      } else {
        promises.push(Promise.resolve({ documents: [], total: 0, page: 1, totalPages: 0 }));
      }

      const [notesResponse, documentsResponse] = await Promise.all(promises);
      
      // Convert to unified format
      const unifiedNotes = (notesResponse.notes || []).map(noteToUnifiedDocument);
      const unifiedDocuments = (documentsResponse.documents || []).map(documentToUnifiedDocument);
      
      // Combine and sort
      let allDocuments = [...unifiedNotes, ...unifiedDocuments];
      
      // Apply additional filtering
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        allDocuments = allDocuments.filter(doc => 
          doc.title.toLowerCase().includes(searchLower) ||
          doc.content?.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
        );
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        allDocuments = allDocuments.filter(doc =>
          filters.tags!.some(tag => doc.tags.includes(tag))
        );
      }
      
      // Sort documents
      const sortBy = filters?.sortBy || 'updated_at';
      const sortOrder = filters?.sortOrder || 'desc';
      
      allDocuments.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          case 'updated_at':
          default:
            aValue = new Date(a.updated_at).getTime();
            bValue = new Date(b.updated_at).getTime();
            break;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Calculate pagination
      const total = allDocuments.length;
      const limit = filters?.limit || 12;
      const page = filters?.page || 1;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return {
        documents: allDocuments.slice(startIndex, endIndex),
        total,
        page,
        totalPages
      };
      
    } catch (error) {
      console.error('Error fetching unified documents:', error);
      throw error;
    }
  },

  // Get statistics for unified documents
  getUnifiedStats: async (): Promise<UnifiedDocumentStats> => {
    try {
      // Fetch notes stats
      let notesTotal = 0;
      try {
        const notesResponse = await notesApi.getNotes({ limit: 1 });
        notesTotal = notesResponse.total || 0;
      } catch (error) {
        console.warn('Could not fetch notes stats:', error);
      }

      // Fetch documents stats
      let documentsTotal = 0;
      let storageUsedBytes = 0;
      try {
        const documentsResponse = await documentsApi.getWorkspaceDocuments({ limit: 100 }); // Get more docs for storage calc
        documentsTotal = documentsResponse.total || 0;
        
        // Calculate storage (only from files) - safer implementation
        if (documentsResponse.documents && Array.isArray(documentsResponse.documents)) {
          storageUsedBytes = documentsResponse.documents
            .filter(doc => doc && typeof doc.file_size === 'number')
            .reduce((total, doc) => total + doc.file_size, 0);
        }
      } catch (error) {
        console.warn('Could not fetch documents stats:', error);
      }

      return {
        totalDocuments: notesTotal + documentsTotal,
        totalNotes: notesTotal,
        totalFiles: documentsTotal,
        storageUsedMB: Math.round(storageUsedBytes / (1024 * 1024)),
        storageLimitMB: 1000, // Default limit, should come from settings
        recentlyModified: 0 // Could be calculated based on recent activity
      };
    } catch (error) {
      console.error('Error fetching unified stats:', error);
      throw error;
    }
  },

  // Create a new note (living document)
  createNote: async (noteData: {
    title: string;
    content: string;
    tags?: string[];
  }): Promise<UnifiedDocument> => {
    try {
      const note = await notesApi.createNote({
        title: noteData.title,
        content: noteData.content,
        tags: noteData.tags || []
      });
      return noteToUnifiedDocument(note);
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  // Update a document (note or file metadata)
  updateDocument: async (id: string, type: 'note' | 'file', data: {
    title?: string;
    content?: string;
    description?: string;
    tags?: string[];
  }): Promise<UnifiedDocument> => {
    try {
      if (type === 'note') {
        const note = await notesApi.updateNote(id, {
          title: data.title,
          content: data.content,
          tags: data.tags
        });
        return noteToUnifiedDocument(note);
      } else {
        const document = await documentsApi.updateDocument(id, {
          name: data.title, // Use 'name' instead of 'title' for documents
          title: data.title,
          description: data.description,
          tags: data.tags
        });
        return documentToUnifiedDocument(document);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  // Delete a document
  deleteDocument: async (id: string, type: 'note' | 'file'): Promise<void> => {
    try {
      if (type === 'note') {
        await notesApi.deleteNote(id);
      } else {
        await documentsApi.deleteDocument(id);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Get available tags from both notes and documents
  getAvailableTags: async (): Promise<string[]> => {
    try {
      // Fetch notes tags
      let notesTags: string[] = [];
      try {
        notesTags = await notesApi.getAvailableTags();
      } catch (error) {
        console.warn('Could not fetch notes tags:', error);
      }

      // Fetch documents tags
      let documentsTags: string[] = [];
      try {
        const documentsResponse = await documentsApi.getWorkspaceDocuments({ limit: 100 });
        
        if (documentsResponse.documents && Array.isArray(documentsResponse.documents)) {
          documentsTags = documentsResponse.documents
            .filter(doc => doc && doc.tags && Array.isArray(doc.tags))
            .flatMap(doc => doc.tags as string[]);
        }
      } catch (error) {
        console.warn('Could not fetch documents tags:', error);
      }

      // Combine and deduplicate tags
      const allTags = [...notesTags, ...documentsTags];
      const uniqueTags = Array.from(new Set(allTags));
      return uniqueTags.sort();
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  },

  // Search across all documents
  searchDocuments: async (query: string): Promise<UnifiedDocument[]> => {
    try {
      // Fetch notes search results
      let notes: Note[] = [];
      try {
        const notesResponse = await notesApi.getNotes({ search: query, limit: 50 });
        notes = notesResponse.notes || [];
      } catch (error) {
        console.warn('Could not search notes:', error);
      }

      // Fetch documents search results
      let documents: Document[] = [];
      try {
        const documentsResponse = await documentsApi.getWorkspaceDocuments({ search: query, limit: 50 });
        documents = documentsResponse.documents || [];
      } catch (error) {
        console.warn('Could not search documents:', error);
      }

      // Convert to unified documents
      const unifiedNotes = notes.map(noteToUnifiedDocument);
      const unifiedDocuments = documents.map(documentToUnifiedDocument);

      return [...unifiedNotes, ...unifiedDocuments].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }
};
