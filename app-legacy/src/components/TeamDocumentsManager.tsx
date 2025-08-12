import React, { useState, useEffect, useMemo } from 'react';
import { workspaceApi } from '../services/workspaceApi';
import { TeamDocument, TeamWorkspaceResponse } from '../types/workspace';

// Simple icon components using SVG
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

interface TeamDocumentsManagerProps {
  onDocumentSelect?: (document: TeamDocument) => void;
  className?: string;
}

interface Filters {
  scope: 'own' | 'team' | 'all';
  tags: string[];
  mime_types: string[];
  search: string;
  sort_by: 'created_at' | 'title' | 'file_size';
  sort_order: 'asc' | 'desc';
}

const TeamDocumentsManager: React.FC<TeamDocumentsManagerProps> = ({
  onDocumentSelect,
  className = ''
}) => {
  const [documents, setDocuments] = useState<TeamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    scope: 'all',
    tags: [],
    mime_types: [],
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch documents with current filters
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: TeamWorkspaceResponse = await workspaceApi.getTeamDocumentsFiltered({
        scope: filters.scope,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        mime_types: filters.mime_types.length > 0 ? filters.mime_types : undefined,
        page,
        limit: 20,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      });

      setDocuments(prev => page === 1 ? response.documents : [...prev, ...response.documents]);
      setHasMore(response.pagination?.hasMore || false);

      // Extract available tags
      const tags = new Set<string>();
      response.documents.forEach(doc => {
        doc.tags?.forEach(tag => tags.add(tag));
      });
      setAvailableTags(Array.from(tags));

    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  };

  // Filter documents based on search
  const filteredDocuments = useMemo(() => {
    if (!filters.search) return documents;
    
    const searchLower = filters.search.toLowerCase();
    return documents.filter(doc => 
      doc.title?.toLowerCase().includes(searchLower) ||
      doc.description?.toLowerCase().includes(searchLower) ||
      doc.uploader_name?.toLowerCase().includes(searchLower) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }, [documents, filters.search]);

  useEffect(() => {
    setPage(1);
    fetchDocuments();
  }, [filters.scope, filters.tags, filters.mime_types, filters.sort_by, filters.sort_order]);

  useEffect(() => {
    if (page > 1) {
      fetchDocuments();
    }
  }, [page]);

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScopeLabel = (scope: string): string => {
    switch (scope) {
      case 'own': return 'Meine Dokumente';
      case 'team': return 'Team-Dokumente';
      case 'all': return 'Alle Dokumente';
      default: return scope;
    }
  };

  const getScopeCount = (): { own: number; team: number; all: number } => {
    const own = documents.filter(doc => doc.is_own_document).length;
    const team = documents.filter(doc => !doc.is_own_document).length;
    return { own, team, all: own + team };
  };

  const scopeCounts = getScopeCount();

  return (
    <div className={`team-documents-manager ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Team-Dokumente</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <FilterIcon />
          Filter
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Dokumente durchsuchen..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
        {(['all', 'own', 'team'] as const).map((scope) => (
          <button
            key={scope}
            onClick={() => handleFilterChange('scope', scope)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filters.scope === scope
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {getScopeLabel(scope)} ({scopeCounts[scope]})
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
          {/* Sort Options */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sortieren nach
              </label>
              <select
                value={filters.sort_by}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Erstellungsdatum</option>
                <option value="title">Titel</option>
                <option value="file_size">Dateigröße</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reihenfolge
              </label>
              <select
                value={filters.sort_order}
                onChange={(e) => handleFilterChange('sort_order', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Absteigend</option>
                <option value="asc">Aufsteigend</option>
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span className="inline-block mr-1">
                      <TagIcon />
                    </span>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Documents Grid */}
      <div className="space-y-3">
        {filteredDocuments.map((document) => (
          <div
            key={document.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onDocumentSelect?.(document)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileIcon />
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {document.title || document.name}
                  </h3>
                  {document.is_own_document && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Eigenes
                    </span>
                  )}
                </div>
                
                {document.description && (
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {document.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <UserIcon />
                    {document.uploader_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon />
                    {formatDate(document.uploaded_at)}
                  </span>
                  <span>{formatFileSize(document.file_size)}</span>
                </div>

                {document.tags && document.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {document.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement preview
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Vorschau"
                >
                  <EyeIcon />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement download
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Herunterladen"
                >
                  <DownloadIcon />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setPage(prev => prev + 1)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Weitere laden
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 text-gray-300 mx-auto mb-4">
            <FileIcon />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Keine Dokumente gefunden
          </h3>
          <p className="text-gray-500">
            {filters.search 
              ? 'Versuchen Sie eine andere Suchanfrage oder passen Sie die Filter an.'
              : 'Laden Sie Dokumente hoch oder werden Sie Teil eines Teams, um Dokumente zu sehen.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamDocumentsManager;
