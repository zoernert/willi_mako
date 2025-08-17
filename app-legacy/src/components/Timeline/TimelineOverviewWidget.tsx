import React, { useState, useEffect } from 'react';
import {
  Timeline as ActivityIcon,
  AccessTime as ClockIcon,
  Description as FileTextIcon,
  Group as UsersIcon,
  Error as AlertCircleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Box, Card, CardContent, Typography, Grid, Chip, IconButton, Alert, CircularProgress } from '@mui/material';
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
}

export const TimelineOverviewWidget: React.FC<TimelineOverviewWidgetProps> = ({ className = '' }) => {
  const { state } = useAuth();
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineStats();
  }, [state.token]);

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
        <Box>
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
    </Card>
  );
};
