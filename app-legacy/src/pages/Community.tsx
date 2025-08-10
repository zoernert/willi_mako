import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Add as AddIcon,
  Forum as ForumIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  RateReview as ReviewIcon,
  Visibility as ViewIcon,
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

const Community: React.FC = () => {
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newThread, setNewThread] = useState({
    title: '',
    problem_description: '',
    context: '',
    tags: [] as string[],
  });

  // Feature Flag Check
  const isCommunityEnabled = process.env.REACT_APP_FEATURE_COMMUNITY_HUB === 'true';

  useEffect(() => {
    if (isCommunityEnabled) {
      fetchThreads();
    }
  }, [isCommunityEnabled]);

  const fetchThreads = async () => {
    try {
      const response = await fetch('/api/community/threads', {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setThreads(data.data || []);
      } else {
        showSnackbar('Fehler beim Laden der Community Threads', 'error');
      }
    } catch (error) {
      showSnackbar('Netzwerkfehler beim Laden der Threads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async () => {
    try {
      const response = await fetch('/api/community/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          title: newThread.title,
          initialContent: {
            problem_description: newThread.problem_description,
            context: newThread.context,
          },
          tags: newThread.tags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showSnackbar('Thread erfolgreich erstellt', 'success');
        setCreateDialogOpen(false);
        setNewThread({ title: '', problem_description: '', context: '', tags: [] });
        fetchThreads();
        // Navigate to the new thread
        navigate(`/community/${data.data.id}`);
      } else {
        showSnackbar('Fehler beim Erstellen des Threads', 'error');
      }
    } catch (error) {
      showSnackbar('Netzwerkfehler beim Erstellen des Threads', 'error');
    }
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

  if (!isCommunityEnabled) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Der Community Hub ist aktuell deaktiviert. Bitte wenden Sie sich an Ihren Administrator.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} data-context="community">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ mb: 1, color: 'var(--color-primary, #ee7f4b)' }}>
            Community Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Kollaboratives Wissensmanagement und Problemlösung
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ backgroundColor: 'var(--color-primary, #ee7f4b)' }}
        >
          Neues Thema
        </Button>
      </Box>

      <Grid container spacing={3}>
        {threads.map((thread) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={thread.id}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                '&:hover': { 
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
              onClick={() => navigate(`/community/${thread.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 1 }}>
                    {thread.title}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(thread.status)}
                    label={getStatusText(thread.status)}
                    color={getStatusColor(thread.status) as any}
                    size="small"
                  />
                </Box>

                {thread.document_content?.problem_description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {thread.document_content.problem_description.substring(0, 150)}
                    {thread.document_content.problem_description.length > 150 ? '...' : ''}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {thread.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(thread.created_at).toLocaleDateString('de-DE')}
                  </Typography>
                  <Tooltip title="Thread anzeigen">
                    <IconButton size="small" color="primary">
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {threads.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ForumIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Noch keine Community Threads
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Starten Sie den ersten Thread und teilen Sie Ihr Wissen mit der Community!
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ backgroundColor: 'var(--color-primary, #ee7f4b)' }}
          >
            Ersten Thread erstellen
          </Button>
        </Box>
      )}

      {/* Create Thread Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neuen Community Thread erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Titel"
              value={newThread.title}
              onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              label="Problembeschreibung"
              value={newThread.problem_description}
              onChange={(e) => setNewThread({ ...newThread, problem_description: e.target.value })}
              multiline
              rows={4}
              sx={{ mb: 2 }}
              helperText="Beschreiben Sie das Problem, das Sie gemeinsam lösen möchten"
            />
            
            <TextField
              fullWidth
              label="Kontext"
              value={newThread.context}
              onChange={(e) => setNewThread({ ...newThread, context: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              helperText="Zusätzliche Informationen zum Kontext (optional)"
            />
            
            <TextField
              fullWidth
              label="Tags (kommagetrennt)"
              placeholder="z.B. UTILMD, INVOIC, Prozesse"
              onChange={(e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                setNewThread({ ...newThread, tags });
              }}
              helperText="Fügen Sie relevante Tags hinzu um das Thema zu kategorisieren"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateThread} 
            variant="contained"
            disabled={!newThread.title || !newThread.problem_description}
            sx={{ backgroundColor: 'var(--color-primary, #ee7f4b)' }}
          >
            Thread erstellen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Community;
