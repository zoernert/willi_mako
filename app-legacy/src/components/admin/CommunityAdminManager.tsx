// Community Admin Manager Component
// CR-COMMUNITY-HUB-001 - Admin Dashboard Integration
// Autor: AI Assistant
// Datum: 2025-08-10

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper,
  Tooltip,
  Grid,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Forum as ForumIcon,
  RateReview as ReviewIcon,
  CheckCircle as CompletedIcon,
  Schedule as DraftIcon,
  QuestionAnswer as FAQIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  RocketLaunch as InitiativeIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as StatsIcon,
  TrendingUp as TrendingUpIcon,
  Group as CommunityIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../services/apiClient';
import { MarkdownRenderer } from '../Workspace/MarkdownRenderer';

interface CommunityStats {
  totalThreads: number;
  discussingThreads: number;
  reviewThreads: number;
  finalThreads: number;
  totalInitiatives: number;
  totalFAQsFromCommunity: number;
  recentActivity: any[];
}

interface CommunityThread {
  id: string;
  title: string;
  status: 'discussing' | 'review' | 'final';
  tags: string[];
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  document_content: any;
  hasInitiative?: boolean;
}

interface CommunityInitiative {
  id: string;
  thread_id: string;
  title: string;
  target_audience: string;
  status: 'draft' | 'under_review' | 'published' | 'completed';
  created_at: string;
}

const CommunityAdminManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CommunityStats>({
    totalThreads: 0,
    discussingThreads: 0,
    reviewThreads: 0,
    finalThreads: 0,
    totalInitiatives: 0,
    totalFAQsFromCommunity: 0,
    recentActivity: [],
  });
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [initiatives, setInitiatives] = useState<CommunityInitiative[]>([]);
  const [selectedThread, setSelectedThread] = useState<CommunityThread | null>(null);
  const [showThreadDialog, setShowThreadDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishSlug, setPublishSlug] = useState('');
  const [publishSummary, setPublishSummary] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [threadPublications, setThreadPublications] = useState<any[]>([]);
  const [showFAQDialog, setShowFAQDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [faqCreationLoading, setFaqCreationLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'dashboard' | 'threads' | 'initiatives'>('dashboard');
  
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchCommunityStats();
    if (currentView === 'threads') {
      fetchThreads();
    } else if (currentView === 'initiatives') {
      fetchInitiatives();
    }
  }, [currentView, filterStatus]);

  const fetchCommunityStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/community/stats') as any;
      
      // The apiClient already unwraps the response.data, so we should get the stats directly
      const statsData = response || {
        totalThreads: 0,
        discussingThreads: 0,
        reviewThreads: 0,
        finalThreads: 0,
        totalInitiatives: 0,
        totalFAQsFromCommunity: 0,
        recentActivity: [],
      };
      
      console.log('Community Stats Response:', statsData); // Debug log
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching community stats:', error);
      showSnackbar('Fehler beim Laden der Community-Statistiken', 'error');
      // Set default values on error
      setStats({
        totalThreads: 0,
        discussingThreads: 0,
        reviewThreads: 0,
        finalThreads: 0,
        totalInitiatives: 0,
        totalFAQsFromCommunity: 0,
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await apiClient.get('/community/threads', { params }) as any;
      console.log('Threads Response:', response); // Debug log
      setThreads(response || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
      showSnackbar('Fehler beim Laden der Threads', 'error');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublications = async (threadId: string) => {
    try {
      const pubs = await apiClient.get(`/admin/community/threads/${threadId}/publications`) as any;
      setThreadPublications(pubs || []);
      return pubs || [];
    } catch (e) {
      setThreadPublications([]);
      return [] as any[];
    }
  };

  const handleOpenPublish = async (thread: CommunityThread) => {
    setSelectedThread(thread);
    setPublishSlug('');
    setPublishSummary('');
    const pubs = await fetchPublications(thread.id);
    if (pubs && pubs.length > 0) {
      // Prefill with the most recent publication's slug (by published_at desc)
      const latest = [...pubs].sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      })[0];
      if (latest?.slug) {
        setPublishSlug(latest.slug);
      }
      if (latest?.summary) {
        setPublishSummary(latest.summary);
      }
    }
    setShowPublishDialog(true);
  };

  const handlePublish = async () => {
    if (!selectedThread) return;
    const slug = publishSlug.trim();
    if (!slug) {
      showSnackbar('Bitte eine URL-Kennung (Slug) angeben, z.B. utilmd-2025-abschluss', 'warning');
      return;
    }
    try {
      setPublishing(true);
      const created = await apiClient.post(`/admin/community/threads/${selectedThread.id}/publish`, { slug, summary: publishSummary }) as any;
      showSnackbar('Veröffentlicht. Öffentliche Seite ist verfügbar.', 'success');
      await fetchPublications(selectedThread.id);
    } catch (e: any) {
      showSnackbar(e?.message || 'Veröffentlichung fehlgeschlagen', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const fetchInitiatives = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/community/initiatives') as any;
      console.log('Initiatives Response:', response); // Debug log
      setInitiatives(response || []);
    } catch (error) {
      console.error('Error fetching initiatives:', error);
      showSnackbar('Fehler beim Laden der Initiativen', 'error');
      setInitiatives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFAQ = async (threadId: string) => {
    try {
      setFaqCreationLoading(true);
      const response = await apiClient.post('/admin/community/create-faq-from-thread', {
        threadId,
      }) as any;
      
      showSnackbar('FAQ erfolgreich aus Thread erstellt!', 'success');
      fetchCommunityStats(); // Refresh stats
      setShowFAQDialog(false);
      setSelectedThread(null);
    } catch (error: any) {
      console.error('Error creating FAQ:', error);
      const message = error.response?.data?.message || 'Fehler beim Erstellen der FAQ';
      showSnackbar(message, 'error');
    } finally {
      setFaqCreationLoading(false);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      setDeleteLoading(true);
      await apiClient.delete(`/admin/community/threads/${threadId}`) as any;
      
      showSnackbar('Thread erfolgreich gelöscht!', 'success');
      setShowDeleteDialog(false);
      setSelectedThread(null);
      fetchThreads();
      fetchCommunityStats();
    } catch (error: any) {
      console.error('Error deleting thread:', error);
      const message = error.response?.data?.message || 'Fehler beim Löschen des Threads';
      showSnackbar(message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleThreadStatusChange = async (threadId: string, newStatus: string) => {
    try {
      await apiClient.put(`/community/threads/${threadId}/status`, {
        status: newStatus,
      }) as any;
      
      showSnackbar('Thread-Status erfolgreich geändert!', 'success');
      fetchThreads();
      fetchCommunityStats();
    } catch (error: any) {
      console.error('Error updating thread status:', error);
      const message = error.response?.data?.message || 'Fehler beim Ändern des Status';
      showSnackbar(message, 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'discussing': return <DraftIcon color="warning" />;
      case 'review': return <ReviewIcon color="info" />;
      case 'final': return <CompletedIcon color="success" />;
      default: return <ForumIcon />;
    }
  };

  const getStatusColor = (status: string): "default" | "warning" | "info" | "success" => {
    switch (status) {
      case 'discussing': return 'warning';
      case 'review': return 'info';
      case 'final': return 'success';
      default: return 'default';
    }
  };

  const getInitiativeStatusColor = (status: string): "default" | "warning" | "info" | "success" => {
    switch (status) {
      case 'draft': return 'default';
      case 'under_review': return 'warning';
      case 'published': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const renderDashboard = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Community Hub Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Verwaltung der Community-Threads und Initiativen
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats Cards */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ForumIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Threads Gesamt
                  </Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {stats.totalThreads}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ReviewIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Zur Review
                  </Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {stats.reviewThreads}
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setFilterStatus('review');
                    setCurrentView('threads');
                  }}
                  sx={{ mt: 1 }}
                >
                  Bearbeiten
                </Button>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <InitiativeIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Initiativen
                  </Typography>
                </Box>
                <Typography variant="h4" color="secondary.main">
                  {stats.totalInitiatives}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setCurrentView('initiatives')}
                  sx={{ mt: 1 }}
                >
                  Verwalten
                </Button>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FAQIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    FAQs erstellt
                  </Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {stats.totalFAQsFromCommunity}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Quick Actions */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Schnellaktionen
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<ReviewIcon />}
                onClick={() => {
                  setFilterStatus('review');
                  setCurrentView('threads');
                }}
                disabled={stats.reviewThreads === 0}
              >
                Threads zur Review ({stats.reviewThreads})
              </Button>
              <Button
                variant="outlined"
                startIcon={<CompletedIcon />}
                onClick={() => {
                  setFilterStatus('final');
                  setCurrentView('threads');
                }}
              >
                Finale Threads ({stats.finalThreads})
              </Button>
              <Button
                variant="outlined"
                startIcon={<InitiativeIcon />}
                onClick={() => setCurrentView('initiatives')}
              >
                Initiativen verwalten
              </Button>
            </Box>
          </Paper>

          {/* Recent Activity */}
          {stats.recentActivity && stats.recentActivity.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Letzte Aktivitäten
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {stats.recentActivity.map((activity, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: index < stats.recentActivity.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                    <Typography variant="body2">
                      {activity.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(activity.timestamp).toLocaleString('de-DE')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </>
      )}
    </Box>
  );

  const renderThreads = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Community Threads
        </Typography>
        <Button
          variant="outlined"
          onClick={() => setCurrentView('dashboard')}
        >
          Zurück zum Dashboard
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={filterStatus}
            label="Status Filter"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">Alle</MenuItem>
            <MenuItem value="discussing">Diskussion</MenuItem>
            <MenuItem value="review">Review</MenuItem>
            <MenuItem value="final">Final</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          size="small"
          onClick={fetchThreads}
          disabled={loading}
        >
          Aktualisieren
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Titel</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Erstellt</TableCell>
                <TableCell>Aktualisiert</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {threads.map((thread) => (
                <TableRow key={thread.id}>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(thread.status)}
                      label={thread.status}
                      color={getStatusColor(thread.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {thread.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {thread.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(thread.created_at).toLocaleDateString('de-DE')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(thread.updated_at).toLocaleDateString('de-DE')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Details anzeigen">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedThread(thread);
                            setShowThreadDialog(true);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {thread.status === 'review' && (
                        <Tooltip title="Als final markieren">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleThreadStatusChange(thread.id, 'final')}
                          >
                            <CompletedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {thread.status === 'final' && thread.document_content?.final_solution && (
                        <Tooltip title="FAQ erstellen">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedThread(thread);
                              setShowFAQDialog(true);
                            }}
                          >
                            <FAQIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="Öffentlich veröffentlichen (Read-Only)">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleOpenPublish(thread)}
                        >
                          <PublicIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Thread löschen">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedThread(thread);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {threads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">
                      Keine Threads gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onClose={() => setShowPublishDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thread veröffentlichen (Read-Only)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Erzeuge einen öffentlichen, schreibgeschützten Stand dieses Threads. Besucher sehen nur diesen Stand.
          </Typography>
          <TextField
            label="URL-Kennung (Slug)"
            placeholder="z.B. utilmd-2025-abschluss"
            fullWidth
            size="small"
            value={publishSlug}
            onChange={(e) => setPublishSlug(e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())}
            helperText="Nur Kleinbuchstaben, Zahlen und Bindestriche."
            sx={{ mb: 2 }}
          />
          <TextField
            label="Kurze Zusammenfassung (optional)"
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={publishSummary}
            onChange={(e) => setPublishSummary(e.target.value)}
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>Bereits veröffentlichte Stände</Typography>
          {threadPublications.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Keine Veröffentlichungen vorhanden.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {threadPublications.map((p) => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{p.title}</Typography>
                    <Typography variant="caption" color="text.secondary">Slug: {p.slug} • Veröffentlicht: {new Date(p.published_at).toLocaleDateString('de-DE')}</Typography>
                  </Box>
                  <Button href={`/community/public/${p.slug}`} target="_blank" rel="noopener noreferrer" size="small">Öffnen</Button>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPublishDialog(false)}>Schließen</Button>
          <Button onClick={handlePublish} disabled={publishing || !publishSlug} variant="contained">
            {publishing ? 'Veröffentlichen…' : 'Veröffentlichen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderInitiatives = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Community Initiativen
        </Typography>
        <Button
          variant="outlined"
          onClick={() => setCurrentView('dashboard')}
        >
          Zurück zum Dashboard
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Titel</TableCell>
                <TableCell>Zielgruppe</TableCell>
                <TableCell>Erstellt</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {initiatives.map((initiative) => (
                <TableRow key={initiative.id}>
                  <TableCell>
                    <Chip
                      label={initiative.status}
                      color={getInitiativeStatusColor(initiative.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {initiative.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {initiative.target_audience}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(initiative.created_at).toLocaleDateString('de-DE')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Initiative anzeigen">
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {initiatives.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      Keine Initiativen gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  return (
    <Box>
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'threads' && renderThreads()}
      {currentView === 'initiatives' && renderInitiatives()}

      {/* Thread Details Dialog */}
      <Dialog 
        open={showThreadDialog} 
        onClose={() => setShowThreadDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Thread Details: {selectedThread?.title}
        </DialogTitle>
        <DialogContent>
          {selectedThread && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Status:</Typography>
                <Chip
                  icon={getStatusIcon(selectedThread.status)}
                  label={selectedThread.status}
                  color={getStatusColor(selectedThread.status)}
                />
              </Box>
              
              {selectedThread.tags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Tags:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selectedThread.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

              {selectedThread.document_content?.problem_description && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Problembeschreibung</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <MarkdownRenderer content={selectedThread.document_content.problem_description} />
                  </AccordionDetails>
                </Accordion>
              )}

              {selectedThread.document_content?.context && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Kontext</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <MarkdownRenderer content={selectedThread.document_content.context} />
                  </AccordionDetails>
                </Accordion>
              )}

              {selectedThread.document_content?.final_solution?.content && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Finale Lösung</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <MarkdownRenderer content={selectedThread.document_content.final_solution.content} />
                    {selectedThread.document_content.final_solution.approved_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Freigegeben am: {new Date(selectedThread.document_content.final_solution.approved_at).toLocaleString('de-DE')}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowThreadDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAQ Creation Dialog */}
      <Dialog 
        open={showFAQDialog} 
        onClose={() => setShowFAQDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          FAQ aus Thread erstellen
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Eine FAQ wird basierend auf der finalen Lösung dieses Threads erstellt.
          </Alert>
          <Typography variant="body2">
            Thread: <strong>{selectedThread?.title}</strong>
          </Typography>
          {selectedThread?.document_content?.final_solution?.content && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Finale Lösung:
              </Typography>
              <Typography variant="body2" sx={{ maxHeight: 200, overflow: 'auto' }}>
                {selectedThread.document_content.final_solution.content.substring(0, 300)}
                {selectedThread.document_content.final_solution.content.length > 300 && '...'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFAQDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="contained"
            onClick={() => selectedThread && handleCreateFAQ(selectedThread.id)}
            disabled={faqCreationLoading}
          >
            {faqCreationLoading ? <CircularProgress size={20} /> : 'FAQ erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteDialog} 
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Thread löschen
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
          </Alert>
          <Typography variant="body1" gutterBottom>
            Sind Sie sicher, dass Sie den folgenden Thread löschen möchten?
          </Typography>
          <Typography variant="body2" fontWeight="medium" sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            {selectedThread?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Dies wird auch alle zugehörigen Kommentare und Initiativen löschen.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="contained"
            color="error"
            onClick={() => selectedThread && handleDeleteThread(selectedThread.id)}
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={20} /> : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunityAdminManager;
