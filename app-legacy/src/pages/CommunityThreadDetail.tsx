import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Comment as CommentIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  RateReview as ReviewIcon,
  Forum as ForumIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';

interface CommunityThread {
  id: string;
  title: string;
  status: 'discussing' | 'review' | 'final';
  tags: string[];
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  document_content: {
    problem_description?: string;
    context?: string;
    analysis?: string;
    solution_proposals?: Array<{
      id: string;
      content: string;
      created_by: string;
      created_at: string;
    }>;
    final_solution?: {
      content: string;
      approved_by?: string;
      approved_at?: string;
    };
  };
}

interface Comment {
  id: string;
  thread_id: string;
  block_id: string;
  content: string;
  created_by_user_id: string;
  created_at: string;
}

const CommunityThreadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [thread, setThread] = useState<CommunityThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState('');
  const [newProposal, setNewProposal] = useState('');
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    console.log('Effect triggered - ID:', id, 'Token:', !!state.token);
    if (id && state.token) {
      fetchThread();
      fetchComments();
    } else if (id && !state.token) {
      console.log('No token available, waiting...');
      // Wait a bit for token to be loaded from localStorage
      const timer = setTimeout(() => {
        if (state.token) {
          fetchThread();
          fetchComments();
        } else {
          console.error('No token available after timeout');
          navigate('/login');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [id, state.token]);

  const fetchThread = async () => {
    try {
      console.log('Fetching thread with ID:', id);
      console.log('Token available:', !!state.token);
      
      const response = await fetch(`/api/community/threads/${id}`, {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Thread data received:', data);
        setThread(data.data);
      } else {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        showSnackbar('Fehler beim Laden des Threads', 'error');
        navigate('/community');
      }
    } catch (error) {
      showSnackbar('Netzwerkfehler beim Laden des Threads', 'error');
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/community/threads/${id}/comments`, {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleUpdateSection = async (sectionKey: string, content: string) => {
    try {
      const patchOps = [
        {
          op: 'replace',
          path: `/${sectionKey}`,
          value: content,
        },
      ];

      const response = await fetch(`/api/community/threads/${id}/document`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
          'If-Version': thread?.updated_at || '',
        },
        body: JSON.stringify(patchOps),
      });

      if (response.ok) {
        const data = await response.json();
        setThread(data.data);
        setEditingSection(null);
        setSectionContent('');
        showSnackbar('Sektion erfolgreich aktualisiert', 'success');
      } else if (response.status === 409) {
        showSnackbar('Konflikt: Thread wurde von jemand anderem bearbeitet. Bitte laden Sie die Seite neu.', 'warning');
        fetchThread();
      } else {
        showSnackbar('Fehler beim Aktualisieren der Sektion', 'error');
      }
    } catch (error) {
      showSnackbar('Netzwerkfehler beim Aktualisieren', 'error');
    }
  };

  const handleAddProposal = async () => {
    try {
      const patchOps = [
        {
          op: 'add',
          path: '/solution_proposals/-',
          value: {
            content: newProposal,
          },
        },
      ];

      const response = await fetch(`/api/community/threads/${id}/document`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
          'If-Version': thread?.updated_at || '',
        },
        body: JSON.stringify(patchOps),
      });

      if (response.ok) {
        const data = await response.json();
        setThread(data.data);
        setNewProposal('');
        setShowProposalDialog(false);
        showSnackbar('Lösungsvorschlag hinzugefügt', 'success');
      } else if (response.status === 409) {
        showSnackbar('Konflikt: Thread wurde von jemand anderem bearbeitet. Bitte laden Sie die Seite neu.', 'warning');
        fetchThread();
      } else {
        showSnackbar('Fehler beim Hinzufügen des Vorschlags', 'error');
      }
    } catch (error) {
      showSnackbar('Netzwerkfehler beim Hinzufügen des Vorschlags', 'error');
    }
  };

  const startEditing = (section: string, currentContent: string) => {
    setEditingSection(section);
    setSectionContent(currentContent || '');
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setSectionContent('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'discussing': return 'primary';
      case 'review': return 'warning';
      case 'final': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'discussing': return <ForumIcon />;
      case 'review': return <ReviewIcon />;
      case 'final': return <CheckIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'discussing': return 'Diskussion';
      case 'review': return 'Review';
      case 'final': return 'Finalisiert';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!thread) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Thread nicht gefunden</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} data-context="community">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/community')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1" sx={{ color: 'var(--color-primary, #ee7f4b)' }}>
            {thread.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Chip
              icon={getStatusIcon(thread.status)}
              label={getStatusText(thread.status)}
              color={getStatusColor(thread.status) as any}
            />
            <Typography variant="body2" color="text.secondary">
              Erstellt am {new Date(thread.created_at).toLocaleDateString('de-DE')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tags */}
      {thread.tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {thread.tags.map((tag) => (
            <Chip key={tag} label={tag} variant="outlined" />
          ))}
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Problem Description */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="error.main">
                  Problembeschreibung
                </Typography>
                {editingSection !== 'problem_description' && (
                  <IconButton
                    size="small"
                    onClick={() => startEditing('problem_description', thread.document_content?.problem_description || '')}
                  >
                    <EditIcon />
                  </IconButton>
                )}
              </Box>
              
              {editingSection === 'problem_description' ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={sectionContent}
                    onChange={(e) => setSectionContent(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      startIcon={<SaveIcon />}
                      onClick={() => handleUpdateSection('problem_description', sectionContent)}
                      variant="contained"
                      size="small"
                    >
                      Speichern
                    </Button>
                    <Button
                      startIcon={<CancelIcon />}
                      onClick={cancelEditing}
                      size="small"
                    >
                      Abbrechen
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body1">
                  {thread.document_content?.problem_description || 'Noch keine Problembeschreibung vorhanden.'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Context */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="info.main">
                  Kontext
                </Typography>
                {editingSection !== 'context' && (
                  <IconButton
                    size="small"
                    onClick={() => startEditing('context', thread.document_content?.context || '')}
                  >
                    <EditIcon />
                  </IconButton>
                )}
              </Box>
              
              {editingSection === 'context' ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={sectionContent}
                    onChange={(e) => setSectionContent(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      startIcon={<SaveIcon />}
                      onClick={() => handleUpdateSection('context', sectionContent)}
                      variant="contained"
                      size="small"
                    >
                      Speichern
                    </Button>
                    <Button
                      startIcon={<CancelIcon />}
                      onClick={cancelEditing}
                      size="small"
                    >
                      Abbrechen
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body1">
                  {thread.document_content?.context || 'Noch kein Kontext hinzugefügt.'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Solution Proposals */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="success.main">
                  Lösungsvorschläge
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setShowProposalDialog(true)}
                  variant="outlined"
                  size="small"
                  disabled={thread.status === 'final'}
                >
                  Vorschlag hinzufügen
                </Button>
              </Box>
              
              {thread.document_content?.solution_proposals && thread.document_content.solution_proposals.length > 0 ? (
                <List>
                  {thread.document_content?.solution_proposals?.map((proposal, index) => (
                    <React.Fragment key={proposal.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body1">
                              {proposal.content}
                            </Typography>
                          }
                          secondary={`Vorschlag ${index + 1} • ${new Date(proposal.created_at).toLocaleDateString('de-DE')}`}
                        />
                      </ListItem>
                      {index < (thread.document_content.solution_proposals?.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Noch keine Lösungsvorschläge vorhanden.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Final Solution */}
        {thread.document_content?.final_solution && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ border: '2px solid', borderColor: 'warning.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="warning.main">
                    Finale Lösung
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {thread.document_content?.final_solution?.content}
                </Typography>
                {thread.document_content?.final_solution?.approved_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Genehmigt am {new Date(thread.document_content?.final_solution?.approved_at || '').toLocaleDateString('de-DE')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Add Proposal Dialog */}
      <Dialog open={showProposalDialog} onClose={() => setShowProposalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neuen Lösungsvorschlag hinzufügen</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={newProposal}
            onChange={(e) => setNewProposal(e.target.value)}
            placeholder="Beschreiben Sie Ihren Lösungsvorschlag..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProposalDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddProposal} 
            variant="contained"
            disabled={!newProposal.trim()}
          >
            Vorschlag hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Comments */}
      <Fab
        color="primary"
        aria-label="comments"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => showSnackbar('Kommentar-Funktion wird bald verfügbar sein', 'info')}
      >
        <CommentIcon />
      </Fab>
    </Box>
  );
};

export default CommunityThreadDetail;
