// Community Hub Page
// CR-COMMUNITY-HUB-001 - Frontend
// Autor: AI Assistant
// Datum: 2025-08-09

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Mock types for now - in real implementation these would come from API types
interface ThreadSummary {
  id: string;
  title: string;
  status: 'discussing' | 'review' | 'final';
  tags: string[];
  created_at: string;
  updated_at: string;
  proposal_count: number;
  comment_count: number;
}

interface CreateThreadData {
  title: string;
  initialContent?: {
    problem_description?: string;
    context?: string;
  };
  tags?: string[];
}

const CommunityPage: React.FC = () => {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    tags: ''
  });

  // Load threads on component mount
  useEffect(() => {
    loadThreads();
  }, [filters]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.tags) queryParams.append('tags', filters.tags);

      const response = await fetch(`/api/community/threads?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load threads');
      }

      const data = await response.json();
      setThreads(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createThread = async (threadData: CreateThreadData) => {
    try {
      setCreateLoading(true);
      const response = await fetch('/api/community/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(threadData)
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      const data = await response.json();
      router.push(`/community/thread/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread');
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'discussing':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'final':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'discussing':
        return 'In Diskussion';
      case 'review':
        return 'In Überprüfung';
      case 'final':
        return 'Abgeschlossen';
      default:
        return status;
    }
  };

  return (
    <>
      <Head>
        <title>Community Hub - Kollaboratives Wissensmanagement</title>
        <meta name="description" content="Gemeinsam Lösungen für komplexe Probleme in der Marktkommunikation entwickeln" />
      </Head>
      
      <div className="min-h-screen bg-gray-50" data-context="community">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Community Hub
            </h1>
            <p className="text-gray-600">
              Kollaborativ Lösungen für komplexe Probleme entwickeln und Wissen teilen
            </p>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Alle Status</option>
                  <option value="discussing">In Diskussion</option>
                  <option value="review">In Überprüfung</option>
                  <option value="final">Abgeschlossen</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Tags (kommagetrennt)"
                  value={filters.tags}
                  onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {threads.length} Thread(s) gefunden
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Neuen Thread erstellen
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="text-red-800">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 underline mt-2"
              >
                Schließen
              </button>
            </div>
          )}

          {/* Thread List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Lade Threads...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Keine Threads gefunden.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 text-primary underline"
                >
                  Erstellen Sie den ersten Thread
                </button>
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/community/thread/${thread.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 hover:text-primary">
                      {thread.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(thread.status)}`}>
                      {getStatusLabel(thread.status)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {thread.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <div className="flex space-x-4">
                      <span>{thread.proposal_count} Lösungsvorschläge</span>
                      <span>{thread.comment_count} Kommentare</span>
                    </div>
                    <div>
                      Aktualisiert: {new Date(thread.updated_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Thread Modal */}
        {showCreateForm && (
          <CreateThreadModal
            onClose={() => setShowCreateForm(false)}
            onSubmit={createThread}
            loading={createLoading}
          />
        )}
      </div>
    </>
  );
};

// Create Thread Modal Component
interface CreateThreadModalProps {
  onClose: () => void;
  onSubmit: (data: CreateThreadData) => void;
  loading: boolean;
}

const CreateThreadModal: React.FC<CreateThreadModalProps> = ({ onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState<CreateThreadData>({
    title: '',
    initialContent: {
      problem_description: '',
      context: ''
    },
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim().length < 5) {
      alert('Titel muss mindestens 5 Zeichen lang sein');
      return;
    }
    
    const tagsArray = tagInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    onSubmit({
      ...formData,
      tags: tagsArray
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Neuen Thread erstellen</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Beschreibender Titel für das Problem"
                required
                minLength={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Problembeschreibung
              </label>
              <textarea
                value={formData.initialContent?.problem_description || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  initialContent: {
                    ...formData.initialContent,
                    problem_description: e.target.value
                  }
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Detaillierte Beschreibung des Problems..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontext
              </label>
              <textarea
                value={formData.initialContent?.context || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  initialContent: {
                    ...formData.initialContent,
                    context: e.target.value
                  }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Relevanter Kontext, betroffene Systeme, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (kommagetrennt)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="UTILMD, INVOIC, Abrechnung, etc."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Erstelle...' : 'Thread erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
