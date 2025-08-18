import React, { useState, useEffect } from 'react';
import {
  Timeline as ActivityIcon,
  AccessTime as ClockIcon,
  Description as FileTextIcon,
  Group as UsersIcon,
  Error as AlertCircleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Archive as ArchiveIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip, 
  IconButton, 
  Alert, 
  CircularProgress, 
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface TimelineStats {
  total_timelines: number;
  active_timelines: number;
  archived_timelines: number;
  total_activities: number;
  activities_today: number;
  activities_this_week: number;
  most_active_timeline: {
    id: number;
    name: string;
    activity_count: number;
  } | null;
  recent_activities: Array<{
    id: number;
    timeline_name: string;
    activity_type: string;
    title: string;
    created_at: string;
  }>;
  processing_queue_count: number;
}

interface TimelineOverviewWidgetProps {
  className?: string;
  onTimelineSelect?: (timelineId: string) => void;
}

export const TimelineOverviewWidget: React.FC<TimelineOverviewWidgetProps> = ({ 
  className = '', 
  onTimelineSelect 
}) => {
  const { state } = useAuth();
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; timeline: any } | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<any | null>(null);

  useEffect(() => {
    fetchTimelineStats();
    fetchTimelines();
  }, [state.token]);

  const fetchTimelines = async () => {
    try {
      const response = await fetch('/api/timelines', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timelines');
      }

      const data = await response.json();
      setTimelines(data);
    } catch (err: any) {
      console.error('Error fetching timelines:', err);
    }
  };

  const fetchTimelineStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/timeline-stats', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching timeline stats:', err);
      setError(err.message || 'Fehler beim Laden der Timeline-Statistiken');
    } finally {
      setLoading(false);
    }
  };

  const formatActivityType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'chat_session': 'Chat-Session',
      'code_lookup': 'Code-Lookup',
      'bilateral_clarification': 'Bilaterale Klärung',
      'screenshot_analysis': 'Screenshot-Analyse',
      'message_analysis': 'Nachrichten-Analyse',
      'notes': 'Notizen'
    };
    return typeMap[type] || type;
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    
    return date.toLocaleDateString('de-DE');
  };

  const handleTimelineMenuOpen = (event: React.MouseEvent<HTMLElement>, timeline: any) => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, timeline });
  };

  const handleTimelineMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleViewTimeline = (timeline: any) => {
    handleTimelineMenuClose();
    if (onTimelineSelect) {
      onTimelineSelect(timeline.id);
    }
  };

  const handleArchiveTimeline = (timeline: any) => {
    handleTimelineMenuClose();
    setSelectedTimeline(timeline);
    setArchiveDialogOpen(true);
  };

  const confirmArchiveTimeline = async () => {
    if (!selectedTimeline) return;

    try {
      const response = await fetch(`/api/timelines/${selectedTimeline.id}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to archive timeline');
      }

      setArchiveDialogOpen(false);
      setSelectedTimeline(null);
      // Refresh data
      fetchTimelineStats();
      fetchTimelines();
    } catch (err: any) {
      console.error('Error archiving timeline:', err);
      alert('Fehler beim Archivieren der Timeline');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Lade Timeline-Statistiken...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Box textAlign="center">
            <IconButton onClick={fetchTimelineStats} color="primary">
              <RefreshIcon />
            </IconButton>
            <Typography variant="body2">Erneut versuchen</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
          <Box display="flex" alignItems="center">
            <ActivityIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="h3">
              Timeline-Übersicht
            </Typography>
          </Box>
          <IconButton onClick={fetchTimelineStats} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Statistik-Karten */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box p={2} bgcolor="primary.50" borderRadius={1}>
              <FileTextIcon color="primary" />
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {stats.active_timelines}
              </Typography>
              <Typography variant="body2" color="primary.main">
                Aktive Timelines
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Box p={2} bgcolor="success.50" borderRadius={1}>
              <ActivityIcon color="success" />
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.activities_today}
              </Typography>
              <Typography variant="body2" color="success.main">
                Aktivitäten heute
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Box p={2} bgcolor="secondary.50" borderRadius={1}>
              <TrendingUpIcon color="secondary" />
              <Typography variant="h4" color="secondary.main" fontWeight="bold">
                {stats.activities_this_week}
              </Typography>
              <Typography variant="body2" color="secondary.main">
                Diese Woche
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Box p={2} bgcolor="warning.50" borderRadius={1}>
              <ClockIcon color="warning" />
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.processing_queue_count}
              </Typography>
              <Typography variant="body2" color="warning.main">
                In Warteschlange
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Aktivste Timeline */}
        {stats.most_active_timeline && (
          <Box p={2} bgcolor="grey.50" borderRadius={1} mb={3}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Aktivste Timeline
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="between">
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  {stats.most_active_timeline.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.most_active_timeline.activity_count} Aktivitäten
                </Typography>
              </Box>
              <Box 
                width={32} 
                height={32} 
                bgcolor="primary.100" 
                borderRadius="50%" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
              >
                <ActivityIcon color="primary" fontSize="small" />
              </Box>
            </Box>
          </Box>
        )}

        {/* Neueste Aktivitäten */}
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Neueste Aktivitäten
          </Typography>
          {stats.recent_activities.length === 0 ? (
            <Box textAlign="center" py={3}>
              <ActivityIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary">
                Noch keine Aktivitäten vorhanden
              </Typography>
            </Box>
          ) : (
            <Box>
              {stats.recent_activities.slice(0, 5).map((activity) => (
                <Box 
                  key={activity.id} 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="between" 
                  py={1} 
                  borderBottom="1px solid" 
                  borderColor="grey.100"
                >
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip 
                        label={formatActivityType(activity.activity_type)} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {activity.timeline_name}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      title={activity.title}
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activity.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {formatRelativeTime(activity.created_at)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Timeline-Liste */}
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Meine Timelines
          </Typography>
          {timelines.length === 0 ? (
            <Box textAlign="center" py={3}>
              <FileTextIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary">
                Noch keine Timelines erstellt
              </Typography>
            </Box>
          ) : (
            <Box>
              {timelines.slice(0, 5).map((timeline) => (
                <Box 
                  key={timeline.id} 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="between" 
                  py={2} 
                  px={2}
                  borderRadius={1}
                  bgcolor={timeline.is_active ? 'primary.50' : 'transparent'}
                  border={timeline.is_active ? '1px solid' : 'none'}
                  borderColor="primary.200"
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      bgcolor: timeline.is_active ? 'primary.100' : 'grey.50' 
                    }
                  }}
                  onClick={() => handleViewTimeline(timeline)}
                >
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="body1" fontWeight={timeline.is_active ? 'bold' : 'normal'}>
                        {timeline.name}
                      </Typography>
                      {timeline.is_active && (
                        <Chip 
                          label="Aktiv" 
                          size="small" 
                          color="primary" 
                          variant="filled"
                        />
                      )}
                    </Box>
                    {timeline.description && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {timeline.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Erstellt: {formatRelativeTime(timeline.created_at)}
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small"
                    onClick={(e) => handleTimelineMenuOpen(e, timeline)}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box mt={3} pt={2} borderTop="1px solid" borderColor="grey.200">
          <Box display="flex" alignItems="center" justifyContent="between">
            <Typography variant="body2" color="text.secondary">
              Insgesamt {stats.total_timelines} Timeline{stats.total_timelines !== 1 ? 's' : ''} 
              • {stats.total_activities} Aktivitäten
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.archived_timelines} archiviert
            </Typography>
          </Box>
        </Box>
      </CardContent>

      {/* Timeline Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleTimelineMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleViewTimeline(menuAnchor!.timeline)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Details anzeigen</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleArchiveTimeline(menuAnchor!.timeline)}>
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Archivieren</ListItemText>
        </MenuItem>
      </Menu>

      {/* Archive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Timeline archivieren</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie die Timeline "{selectedTimeline?.name}" wirklich archivieren?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Archivierte Timelines bleiben 90 Tage lang zugänglich und können nicht mehr bearbeitet werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={confirmArchiveTimeline} variant="contained" color="warning">
            Archivieren
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
