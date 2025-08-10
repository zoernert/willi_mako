// Community Thread Detail Page with Living Document
// CR-COMMUNITY-HUB-001 - Frontend
// Autor: AI Assistant
// Datum: 2025-08-09

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Mock types - in real implementation these would come from API types
interface CommunityThread {
  id: string;
  title: string;
  status: 'discussing' | 'review' | 'final';
  tags: string[];
  document_content: LivingDocument;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface LivingDocument {
  problem_description?: string;
  context?: string;
  analysis?: string;
  solution_proposals?: SolutionProposal[];
  final_solution?: FinalSolution;
  meta?: Record<string, any>;
}

interface SolutionProposal {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  votes?: number;
}

interface FinalSolution {
  content: string;
  approved_by?: string;
  approved_at?: string;
}

interface DocumentComment {
  id: string;
  thread_id: string;
  block_id: string;
  content: string;
  created_by_user_id: string;
  created_at: string;
}

const ThreadDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [thread, setThread] = useState<CommunityThread | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newProposalContent, setNewProposalContent] = useState('');
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (id) {
      loadThread();
      loadComments();
    }
  }, [id]);

  const loadThread = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community/threads/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Thread nicht gefunden');
      }

      const data = await response.json();
      setThread(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/community/threads/${id}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.data);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const updateSection = async (sectionKey: string, value: string) => {
    if (!thread) return;

    try {
      const operations = [{
        op: 'replace',
        path: `/${sectionKey}`,
        value: value
      }];

      const response = await fetch(`/api/community/threads/${id}/document`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          operations,
          version: thread.updated_at
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern');
      }

      const data = await response.json();
      setThread(data.data);
      setEditingSection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  const addProposal = async () => {
    if (!thread || !newProposalContent.trim()) return;

    try {
      const operations = [{
        op: 'add',
        path: '/solution_proposals/-',
        value: { content: newProposalContent.trim() }
      }];

      const response = await fetch(`/api/community/threads/${id}/document`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          operations,
          version: thread.updated_at
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Hinzufügen des Vorschlags');
      }

      const data = await response.json();
      setThread(data.data);
      setNewProposalContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen');
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!thread) return;

    try {
      const response = await fetch(`/api/community/threads/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Ändern des Status');
      }

      await loadThread(); // Reload thread
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Statuswechsel');
    }
  };

  const addComment = async (blockId: string) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/community/threads/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          blockId,
          content: newComment.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Hinzufügen des Kommentars');
      }

      setNewComment('');
      setCommentingOn(null);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Kommentieren');
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

  const getCommentsForBlock = (blockId: string) => {
    return comments.filter(c => c.block_id === blockId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Thread nicht gefunden'}
          </h1>
          <button
            onClick={() => router.push('/community')}
            className="text-primary underline"
          >
            Zurück zur Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{thread.title} - Community Hub</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50" data-context="community">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={() => router.push('/community')}
                className="text-primary hover:text-primary-dark mr-4"
              >
                ← Zurück
              </button>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(thread.status)}`}>
                {thread.status === 'discussing' ? 'In Diskussion' : 
                 thread.status === 'review' ? 'In Überprüfung' : 'Abgeschlossen'}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {thread.title}
            </h1>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {thread.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Status Actions */}
            {thread.status !== 'final' && (
              <div className="flex gap-2">
                {thread.status === 'discussing' && (
                  <button
                    onClick={() => updateStatus('review')}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
                  >
                    Zur Überprüfung weiterleiten
                  </button>
                )}
                {thread.status === 'review' && (
                  <>
                    <button
                      onClick={() => updateStatus('final')}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Als final markieren
                    </button>
                    <button
                      onClick={() => updateStatus('discussing')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Zurück zur Diskussion
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

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

          {/* Living Document */}
          <div className="space-y-6">
            {/* Problem Description Section */}
            <DocumentSection
              id="problem_description"
              title="Problembeschreibung"
              content={thread.document_content.problem_description}
              editing={editingSection === 'problem_description'}
              onEdit={() => setEditingSection('problem_description')}
              onSave={(value) => updateSection('problem_description', value)}
              onCancel={() => setEditingSection(null)}
              comments={getCommentsForBlock('problem_description')}
              onComment={() => setCommentingOn('problem_description')}
              commentingOn={commentingOn === 'problem_description'}
              newComment={newComment}
              onCommentChange={setNewComment}
              onCommentSubmit={() => addComment('problem_description')}
              onCommentCancel={() => setCommentingOn(null)}
              canEdit={thread.status !== 'final'}
            />

            {/* Context Section */}
            <DocumentSection
              id="context"
              title="Kontext"
              content={thread.document_content.context}
              editing={editingSection === 'context'}
              onEdit={() => setEditingSection('context')}
              onSave={(value) => updateSection('context', value)}
              onCancel={() => setEditingSection(null)}
              comments={getCommentsForBlock('context')}
              onComment={() => setCommentingOn('context')}
              commentingOn={commentingOn === 'context'}
              newComment={newComment}
              onCommentChange={setNewComment}
              onCommentSubmit={() => addComment('context')}
              onCommentCancel={() => setCommentingOn(null)}
              canEdit={thread.status !== 'final'}
            />

            {/* Analysis Section */}
            <DocumentSection
              id="analysis"
              title="Analyse"
              content={thread.document_content.analysis}
              editing={editingSection === 'analysis'}
              onEdit={() => setEditingSection('analysis')}
              onSave={(value) => updateSection('analysis', value)}
              onCancel={() => setEditingSection(null)}
              comments={getCommentsForBlock('analysis')}
              onComment={() => setCommentingOn('analysis')}
              commentingOn={commentingOn === 'analysis'}
              newComment={newComment}
              onCommentChange={setNewComment}
              onCommentSubmit={() => addComment('analysis')}
              onCommentCancel={() => setCommentingOn(null)}
              canEdit={thread.status !== 'final'}
            />

            {/* Solution Proposals */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Lösungsvorschläge
              </h2>
              
              <div className="space-y-4">
                {thread.document_content.solution_proposals?.map((proposal) => (
                  <div key={proposal.id} className="border-l-4 border-blue-200 pl-4">
                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-gray-800 whitespace-pre-wrap">{proposal.content}</p>
                      <div className="mt-2 text-sm text-gray-600">
                        Von: {proposal.created_by} • {new Date(proposal.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    
                    {/* Comments for this proposal */}
                    <div className="mt-2">
                      {getCommentsForBlock(proposal.id).map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded mt-2">
                          <p className="text-gray-800">{comment.content}</p>
                          <div className="text-sm text-gray-600 mt-1">
                            {new Date(comment.created_at).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      ))}
                      
                      {commentingOn === proposal.id ? (
                        <div className="mt-2">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Kommentar hinzufügen..."
                            rows={3}
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => addComment(proposal.id)}
                              className="bg-primary text-white px-3 py-1 rounded text-sm"
                            >
                              Kommentieren
                            </button>
                            <button
                              onClick={() => setCommentingOn(null)}
                              className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCommentingOn(proposal.id)}
                          className="text-primary text-sm mt-2"
                        >
                          Kommentieren
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add new proposal */}
                {thread.status !== 'final' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <textarea
                      value={newProposalContent}
                      onChange={(e) => setNewProposalContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Neuen Lösungsvorschlag hinzufügen..."
                      rows={4}
                    />
                    <button
                      onClick={addProposal}
                      disabled={!newProposalContent.trim()}
                      className="mt-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50"
                    >
                      Vorschlag hinzufügen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Final Solution */}
            {thread.document_content.final_solution && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-green-900 mb-4">
                  ✅ Finale Lösung
                </h2>
                <div className="bg-white p-4 rounded-md">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {thread.document_content.final_solution.content}
                  </p>
                  {thread.document_content.final_solution.approved_by && (
                    <div className="mt-2 text-sm text-gray-600">
                      Genehmigt von: {thread.document_content.final_solution.approved_by} • 
                      {thread.document_content.final_solution.approved_at && 
                        new Date(thread.document_content.final_solution.approved_at).toLocaleDateString('de-DE')
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Document Section Component
interface DocumentSectionProps {
  id: string;
  title: string;
  content?: string;
  editing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  comments: DocumentComment[];
  onComment: () => void;
  commentingOn: boolean;
  newComment: string;
  onCommentChange: (value: string) => void;
  onCommentSubmit: () => void;
  onCommentCancel: () => void;
  canEdit: boolean;
}

const DocumentSection: React.FC<DocumentSectionProps> = ({
  id,
  title,
  content,
  editing,
  onEdit,
  onSave,
  onCancel,
  comments,
  onComment,
  commentingOn,
  newComment,
  onCommentChange,
  onCommentSubmit,
  onCommentCancel,
  canEdit
}) => {
  const [editValue, setEditValue] = useState(content || '');

  const handleSave = () => {
    onSave(editValue);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {canEdit && !editing && (
          <button
            onClick={onEdit}
            className="text-primary hover:text-primary-dark"
          >
            Bearbeiten
          </button>
        )}
      </div>
      
      {editing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            rows={6}
            placeholder={`${title} hinzufügen...`}
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSave}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
            >
              Speichern
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div>
          {content ? (
            <p className="text-gray-800 whitespace-pre-wrap">{content}</p>
          ) : (
            <p className="text-gray-500 italic">Noch nicht ausgefüllt</p>
          )}
          
          {/* Comments */}
          {comments.length > 0 && (
            <div className="mt-4 space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-3 rounded">
                  <p className="text-gray-800">{comment.content}</p>
                  <div className="text-sm text-gray-600 mt-1">
                    {new Date(comment.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Comment form */}
          {commentingOn ? (
            <div className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => onCommentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Kommentar hinzufügen..."
                rows={3}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onCommentSubmit}
                  className="bg-primary text-white px-3 py-1 rounded text-sm"
                >
                  Kommentieren
                </button>
                <button
                  onClick={onCommentCancel}
                  className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onComment}
              className="text-primary text-sm mt-4"
            >
              Kommentieren
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadDetailPage;
