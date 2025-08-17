import React, { useState, useEffect } from 'react';
import {
  Timeline as TimelineIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  MoreVert as MoreIcon,
  PlayArrow as RetryIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Tooltip
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import ActivityStatusIndicator from './ActivityStatusIndicator';

interface TimelineActivity {
  id: string;
  timeline_id: string;
  feature_name: string;
  activity_type: string;
  title: string;
  content: string;
  metadata: any;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at: string | null;
  is_deleted: boolean;
}

interface Timeline {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TimelineDetailViewProps {
  timelineId: string;
  onClose?: () => void;
}

export const TimelineDetailView: React.FC<TimelineDetailViewProps> = ({
  timelineId,
  onClose
}) => {
  const { state } = useAuth();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  
  // UI state
  const [selectedActivity, setSelectedActivity] = useState<TimelineActivity | null>(null);
  const [activityMenuAnchor, setActivityMenuAnchor] = useState<{ element: HTMLElement; activity: TimelineActivity } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const itemsPerPage = 20;

  useEffect(() => {
    fetchTimelineData();
  }, [timelineId, page, searchTerm, featureFilter, statusFilter]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch timeline info and activities in parallel
      const [timelineResponse, activitiesResponse] = await Promise.all([
        fetch(`/api/timelines/${timelineId}`, {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/timelines/${timelineId}/activities?` + new URLSearchParams({
          page: page.toString(),
          limit: itemsPerPage.toString(),
          search: searchTerm,
          feature: featureFilter !== 'all' ? featureFilter : '',
          status: statusFilter !== 'all' ? statusFilter : ''
        }), {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!timelineResponse.ok || !activitiesResponse.ok) {
        throw new Error('Failed to fetch timeline data');
      }

      const timelineData = await timelineResponse.json();
      const activitiesData = await activitiesResponse.json();

      setTimeline(timelineData);
      setActivities(activitiesData.activities || []);
      setTotalActivities(activitiesData.total || 0);
      setTotalPages(Math.ceil((activitiesData.total || 0) / itemsPerPage));

    } catch (err: any) {
      console.error('Error fetching timeline data:', err);
      setError(err.message || 'Fehler beim Laden der Timeline-Daten');
    } finally {
      setLoading(false);
    }
  };

  const formatActivityType = (feature: string, type: string): string => {
    const featureNames: Record<string, string> = {
      'chat': 'Chat',
      'code-lookup': 'Code-Lookup',
      'bilateral-clarifications': 'Bilaterale Klärung',
      'screenshot-analysis': 'Screenshot-Analyse',
      'message-analyzer': 'Nachrichten-Analyse',
      'notes': 'Notizen'
    };
    
    return featureNames[feature] || feature;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleActivityMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, activity: TimelineActivity) => {
    setActivityMenuAnchor({ element: event.currentTarget, activity });
  };

  const handleActivityMenuClose = () => {
    setActivityMenuAnchor(null);
  };

  const handleRetryActivity = async (activityId: string) => {
    try {
      const response = await fetch(`/api/timeline-activity/${activityId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to retry activity');
      }

      // Refresh the activities list
      await fetchTimelineData();
      
    } catch (err: any) {
      console.error('Error retrying activity:', err);
      setError(err.message || 'Fehler beim Wiederholen der Aktivität');
    }
    handleActivityMenuClose();
  };

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;

    try {
      const response = await fetch(`/api/timeline-activity/${selectedActivity.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      // Refresh the activities list
      await fetchTimelineData();
      setDeleteDialogOpen(false);
      setSelectedActivity(null);
      
    } catch (err: any) {
      console.error('Error deleting activity:', err);
      setError(err.message || 'Fehler beim Löschen der Aktivität');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/api/timelines/${timelineId}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export timeline');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline-${timeline?.name || timelineId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      console.error('Error exporting timeline:', err);
      setError(err.message || 'Fehler beim Exportieren der Timeline');
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" py={8}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Lade Timeline-Details...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={fetchTimelineData} sx={{ ml: 2 }}>
          Erneut versuchen
        </Button>
      </Alert>
    );
  }

  if (!timeline) {
    return (
      <Alert severity="warning">
        Timeline nicht gefunden
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
            <Box display="flex" alignItems="center">
              <TimelineIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h5" component="h1">
                  {timeline.name}
                </Typography>
                {timeline.description && (
                  <Typography variant="body2" color="text.secondary">
                    {timeline.description}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Tooltip title="Exportieren">
                <IconButton onClick={handleExportPDF}>
                  <ExportIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Aktualisieren">
                <IconButton onClick={fetchTimelineData}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {onClose && (
                <Button variant="outlined" onClick={onClose}>
                  Schließen
                </Button>
              )}
            </Box>
          </Box>

          {/* Stats */}
          <Box display="flex" gap={3}>
            <Typography variant="body2" color="text.secondary">
              Erstellt: {formatDate(timeline.created_at)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalActivities} Aktivitäten
            </Typography>
            <Chip 
              label={timeline.is_active ? 'Aktiv' : 'Inaktiv'} 
              color={timeline.is_active ? 'success' : 'default'}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              label="Suchen"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
              sx={{ minWidth: 200 }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Feature</InputLabel>
              <Select
                value={featureFilter}
                label="Feature"
                onChange={(e) => setFeatureFilter(e.target.value)}
              >
                <MenuItem value="all">Alle Features</MenuItem>
                <MenuItem value="chat">Chat</MenuItem>
                <MenuItem value="code-lookup">Code-Lookup</MenuItem>
                <MenuItem value="bilateral-clarifications">Bilaterale Klärung</MenuItem>
                <MenuItem value="screenshot-analysis">Screenshot-Analyse</MenuItem>
                <MenuItem value="message-analyzer">Nachrichten-Analyse</MenuItem>
                <MenuItem value="notes">Notizen</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Alle Status</MenuItem>
                <MenuItem value="pending">Ausstehend</MenuItem>
                <MenuItem value="processing">In Bearbeitung</MenuItem>
                <MenuItem value="completed">Abgeschlossen</MenuItem>
                <MenuItem value="failed">Fehlgeschlagen</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardContent>
          {activities.length === 0 ? (
            <Box textAlign="center" py={6}>
              <TimelineIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Keine Aktivitäten gefunden
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || featureFilter !== 'all' || statusFilter !== 'all'
                  ? 'Versuchen Sie andere Filterkriterien'
                  : 'In dieser Timeline wurden noch keine Aktivitäten erstellt'
                }
              </Typography>
            </Box>
          ) : (
            <>
              {activities.map((activity) => (
                <Card 
                  key={activity.id} 
                  variant="outlined" 
                  sx={{ mb: 2, position: 'relative' }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="start" justifyContent="between">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Chip 
                            label={formatActivityType(activity.feature_name, activity.activity_type)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <ActivityStatusIndicator status={activity.processing_status} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(activity.created_at)}
                          </Typography>
                        </Box>

                        <Typography variant="subtitle1" gutterBottom>
                          {activity.title}
                        </Typography>

                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {activity.content}
                        </Typography>

                        {activity.processed_at && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Verarbeitet: {formatDate(activity.processed_at)}
                          </Typography>
                        )}
                      </Box>

                      <IconButton 
                        onClick={(e) => handleActivityMenuOpen(e, activity)}
                        size="small"
                      >
                        <MoreIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Menu */}
      <Menu
        anchorEl={activityMenuAnchor?.element}
        open={Boolean(activityMenuAnchor)}
        onClose={handleActivityMenuClose}
      >
        <MenuItem 
          onClick={() => {
            setSelectedActivity(activityMenuAnchor!.activity);
            setViewDialogOpen(true);
            handleActivityMenuClose();
          }}
        >
          <ViewIcon sx={{ mr: 1 }} />
          Details anzeigen
        </MenuItem>
        
        {activityMenuAnchor?.activity.processing_status === 'failed' && (
          <MenuItem 
            onClick={() => handleRetryActivity(activityMenuAnchor.activity.id)}
          >
            <RetryIcon sx={{ mr: 1 }} />
            Wiederholen
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => {
            setSelectedActivity(activityMenuAnchor!.activity);
            setEditDialogOpen(true);
            handleActivityMenuClose();
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          Bearbeiten
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            setSelectedActivity(activityMenuAnchor!.activity);
            setDeleteDialogOpen(true);
            handleActivityMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Löschen
        </MenuItem>
      </Menu>

      {/* Activity Detail Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedActivity?.title}
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Box display="flex" gap={1} mb={2}>
                <Chip 
                  label={formatActivityType(selectedActivity.feature_name, selectedActivity.activity_type)}
                  size="small"
                  color="primary"
                />
                <ActivityStatusIndicator status={selectedActivity.processing_status} />
              </Box>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Erstellt: {formatDate(selectedActivity.created_at)}
                {selectedActivity.processed_at && (
                  <> • Verarbeitet: {formatDate(selectedActivity.processed_at)}</>
                )}
              </Typography>

              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                {selectedActivity.content}
              </Typography>

              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Metadaten:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.875rem', overflow: 'auto' }}>
                    {JSON.stringify(selectedActivity.metadata, null, 2)}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Aktivität löschen
        </DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie diese Aktivität wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
          {selectedActivity && (
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="subtitle2">
                {selectedActivity.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(selectedActivity.created_at)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleDeleteActivity} 
            color="error" 
            variant="contained"
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
