import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import TeamService, { LeaderboardEntry } from '../../services/teamService';

interface TeamLeaderboardProps {
  refreshTrigger?: number;
  teamId?: string;
}

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ refreshTrigger, teamId }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { state } = useAuth();
  const user = state.user;

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!teamId) {
        setError('Keine Team-ID verfügbar');
        return;
      }
      
      const data = await TeamService.getLeaderboard(teamId);
      setLeaderboard(data);
    } catch (error: any) {
      setError(error.message || 'Fehler beim Laden der Bestenliste');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [refreshTrigger]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon sx={{ color: '#FFD700' }} />;
      case 2:
        return <TrophyIcon sx={{ color: '#C0C0C0' }} />;
      case 3:
        return <TrophyIcon sx={{ color: '#CD7F32' }} />;
      default:
        return <StarIcon sx={{ color: '#757575' }} />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700';
      case 2:
        return '#C0C0C0';
      case 3:
        return '#CD7F32';
      default:
        return '#757575';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            🏆 Team-Bestenliste
          </Typography>
          <Tooltip title="Aktualisieren">
            <RefreshIcon 
              sx={{ cursor: 'pointer', color: 'text.secondary' }}
              onClick={loadLeaderboard}
            />
          </Tooltip>
        </Box>
        
        {leaderboard.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            Noch keine Punkte in diesem Team gesammelt.
            Lade Dokumente hoch und teile dein Wissen!
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {leaderboard.map((entry, index) => (
              <ListItem
                key={entry.user_id}
                sx={{
                  bgcolor: entry.user_id === user?.id ? 'primary.50' : 'transparent',
                  borderRadius: 1,
                  mb: 1,
                  border: entry.user_id === user?.id ? '2px solid' : '1px solid',
                  borderColor: entry.user_id === user?.id ? 'primary.main' : 'divider',
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getRankColor(entry.rank) }}>
                    {getRankIcon(entry.rank)}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {entry.user_name || `User ${entry.user_id}`}
                      </Typography>
                      {entry.user_id === user?.id && (
                        <Chip label="Du" size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={`Rang ${entry.rank}`}
                />
                
                <Box textAlign="right">
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {entry.total_points}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Punkte
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
        
        <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
          <Typography variant="body2" color="text.secondary" textAlign="center">
            💡 Punkte werden vergeben, wenn deine hochgeladenen Dokumente 
            zur Beantwortung von Fragen verwendet werden.
            <br />
            Punkte verfallen nach 30 Tagen automatisch.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TeamLeaderboard;
