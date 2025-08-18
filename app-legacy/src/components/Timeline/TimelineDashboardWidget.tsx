import React, { useState, useEffect } from 'react';
import {
  Timeline as ActivityIcon,
  AccessTime as ClockIcon,
  TrendingUp as TrendingUpIcon,
  Archive as ArchiveIcon,
  Visibility as ViewIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip, 
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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

interface TimelineDashboardWidgetProps {
  className?: string;
}

export const TimelineDashboardWidget: React.FC<TimelineDashboardWidgetProps> = ({ 
  className = ''
}) => {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [state.token]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch('/api/timeline-stats', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch timeline stats');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch timelines (nur aktive für Dashboard)
      const timelinesResponse = await fetch('/api/timelines?active_only=true', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!timelinesResponse.ok) {
        throw new Error('Failed to fetch timelines');
      }

      const timelinesData = await timelinesResponse.json();
      setTimelines(timelinesData.slice(0, 3)); // Nur die ersten 3 für Dashboard

    } catch (err: any) {
      console.error('Error fetching timeline data:', err);
      setError(err.message || 'Fehler beim Laden der Timeline-Daten');
    } finally {
      setLoading(false);
    }
  };

  const formatActivityType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'chat_session': 'Chat',
      'code_lookup': 'Code-Lookup',
      'bilateral_clarification': 'Klärung',
      'screenshot_analysis': 'Screenshot',
      'message_analysis': 'Nachrichten',
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

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const navigateToTimelines = () => {
    navigate('/timelines');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={3}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Lade Timeline-Daten...
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <ActivityIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="h3">
              Timeline-Aktivität
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={navigateToTimelines}
            startIcon={<ViewIcon />}
          >
            Alle anzeigen
          </Button>
        </Box>

        {/* Kompakte Statistiken */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 3 }}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary.main" fontWeight="bold">
                {stats.active_timelines}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aktive Timelines
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 3 }}>
            <Box textAlign="center">
              <Typography variant="h6" color="success.main" fontWeight="bold">
                {stats.activities_today}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Heute
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 3 }}>
            <Box textAlign="center">
              <Typography variant="h6" color="secondary.main" fontWeight="bold">
                {stats.activities_this_week}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Diese Woche
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 3 }}>
            <Box textAlign="center">
              <Typography variant="h6" color="warning.main" fontWeight="bold">
                {stats.processing_queue_count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Warteschlange
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Neueste Aktivitäten (kompakt) */}
        {stats.recent_activities.length > 0 && (
          <Box mb={3}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Neueste Aktivitäten
            </Typography>
            <Box>
              {stats.recent_activities.slice(0, 3).map((activity) => (
                <Box 
                  key={activity.id} 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between" 
                  py={1} 
                  borderBottom="1px solid" 
                  borderColor="grey.100"
                  sx={{ '&:last-child': { borderBottom: 'none' } }}
                >
                  <Box flex={1} sx={{ minWidth: 0 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip 
                        label={formatActivityType(activity.activity_type)} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                      />
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem'
                      }}
                    >
                      {activity.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                    {formatRelativeTime(activity.created_at)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Aktive Timelines (kompakt) */}
        {timelines.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Aktive Timelines
            </Typography>
            <Box>
              {timelines.map((timeline) => (
                <Box 
                  key={timeline.id} 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between" 
                  py={1}
                  px={1}
                  borderRadius={1}
                  bgcolor="primary.50"
                  mb={1}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'primary.100' },
                    '&:last-child': { mb: 0 }
                  }}
                  onClick={navigateToTimelines}
                >
                  <Box flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {timeline.name}
                    </Typography>
                    {timeline.description && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }}
                      >
                        {timeline.description}
                      </Typography>
                    )}
                  </Box>
                  <Chip 
                    label="Aktiv" 
                    size="small" 
                    color="primary" 
                    variant="filled"
                    sx={{ fontSize: '0.7rem', height: '20px' }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Call-to-Action */}
        <Box pt={2} borderTop="1px solid" borderColor="grey.200">
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={navigateToTimelines}
            size="small"
          >
            Timeline verwalten
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
