import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Pagination,
} from '@mui/material';
import {
  Group as TeamIcon,
  PersonAdd as JoinIcon,
  People as MembersIcon,
  Search as SearchIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';
import TeamService, { Team } from '../../services/teamService';

interface TeamListProps {
  onJoinRequestSent: () => void;
  currentUserTeam?: Team | null;
}

export const TeamList: React.FC<TeamListProps> = ({ onJoinRequestSent, currentUserTeam }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [joinRequestDialogOpen, setJoinRequestDialogOpen] = useState(false);
  const [joinRequestMessage, setJoinRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const { showSnackbar } = useSnackbar();
  const { state } = useAuth();
  const user = state.user;

  const loadTeams = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError('');
      
      const data = await TeamService.getTeams();
      // Filter out user's current team and apply search
      const filteredTeams = data.filter(team => {
        const matchesSearch = !search || 
          team.name.toLowerCase().includes(search.toLowerCase()) ||
          (team.description && team.description.toLowerCase().includes(search.toLowerCase()));
        const notCurrentTeam = !currentUserTeam || team.id !== currentUserTeam.id;
        return matchesSearch && notCurrentTeam;
      });
      
      // Simple pagination logic
      const itemsPerPage = 6;
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedTeams = filteredTeams.slice(startIndex, endIndex);
      
      setTeams(paginatedTeams);
      setTotalPages(Math.ceil(filteredTeams.length / itemsPerPage));
    } catch (error: any) {
      setError(error.message || 'Fehler beim Laden der Teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams(currentPage, searchTerm);
  }, [currentPage, searchTerm, currentUserTeam]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleJoinRequest = (team: Team) => {
    setSelectedTeam(team);
    setJoinRequestDialogOpen(true);
    setJoinRequestMessage(`Hallo! Ich würde gerne dem Team "${team.name}" beitreten, um gemeinsam Wissen zu teilen und zu lernen.`);
  };

  const handleSendJoinRequest = async () => {
    if (!selectedTeam) return;

    setSendingRequest(true);
    try {
      await TeamService.createJoinRequest(selectedTeam.id, joinRequestMessage.trim() || undefined);
      
      showSnackbar('Beitrittsanfrage erfolgreich gesendet!', 'success');
      setJoinRequestDialogOpen(false);
      setJoinRequestMessage('');
      setSelectedTeam(null);
      onJoinRequestSent();
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Senden der Beitrittsanfrage', 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCloseJoinRequestDialog = () => {
    if (!sendingRequest) {
      setJoinRequestDialogOpen(false);
      setJoinRequestMessage('');
      setSelectedTeam(null);
    }
  };

  if (currentUserTeam) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <TeamIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Sie sind bereits Mitglied eines Teams
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Sie sind Mitglied von "{currentUserTeam.name}". 
            Ein Benutzer kann nur einem Team zur Zeit angehören.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Verlassen Sie zuerst Ihr aktuelles Team, um einem anderen Team beizutreten.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Search Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <SearchIcon color="action" />
            <TextField
              fullWidth
              placeholder="Teams durchsuchen..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Teams Grid */}
      {!loading && !error && (
        <>
          {teams.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <TeamIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {searchTerm ? 'Keine Teams gefunden' : 'Noch keine Teams verfügbar'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm 
                    ? `Ihre Suche nach "${searchTerm}" ergab keine Ergebnisse.`
                    : 'Es wurden noch keine Teams erstellt. Erstellen Sie das erste Team!'
                  }
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {teams.map((team) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={team.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <TeamIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="h3">
                            {team.name}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <MembersIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {team.member_count || 0} Mitglied{(team.member_count || 0) !== 1 ? 'er' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {team.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {team.description}
                        </Typography>
                      )}

                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Typography variant="caption" color="text.secondary">
                          Erstellt: {new Date(team.created_at).toLocaleDateString('de-DE')}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<JoinIcon />}
                        onClick={() => handleJoinRequest(team)}
                        sx={{ borderRadius: 2 }}
                      >
                        Beitreten anfragen
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Join Request Dialog */}
      <Dialog 
        open={joinRequestDialogOpen} 
        onClose={handleCloseJoinRequestDialog}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Beitrittsanfrage senden
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {selectedTeam && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Sie möchten dem Team <strong>"{selectedTeam.name}"</strong> beitreten.
                Die Team-Administratoren werden über Ihre Anfrage benachrichtigt.
              </Alert>
            )}
            
            <TextField
              label="Persönliche Nachricht (optional)"
              multiline
              rows={4}
              fullWidth
              value={joinRequestMessage}
              onChange={(e) => setJoinRequestMessage(e.target.value)}
              placeholder="Erzählen Sie den Team-Administratoren, warum Sie beitreten möchten..."
              disabled={sendingRequest}
              helperText="Diese Nachricht wird den Team-Administratoren angezeigt"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseJoinRequestDialog} disabled={sendingRequest}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSendJoinRequest}
            variant="contained"
            startIcon={sendingRequest ? <CircularProgress size={20} /> : <SendIcon />}
            disabled={sendingRequest}
          >
            {sendingRequest ? 'Sende...' : 'Anfrage senden'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamList;
