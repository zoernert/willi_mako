import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemButton,
  IconButton,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Leaderboard as LeaderboardIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';
import TeamService, { Team, TeamMember, TeamInvitation, JoinRequest, LeaderboardEntry } from '../services/teamService';
import TeamList from '../components/Teams/TeamList';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`team-tabpanel-${index}`}
      aria-labelledby={`team-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Teams: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  // State
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  // Team detail states
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load teams on component mount
  useEffect(() => {
    loadTeams();
  }, []);

  // Load team details when selected team changes
  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await TeamService.getTeams();
      const teamsArray = Array.isArray(teamsData) ? teamsData : [];
      setTeams(teamsArray);
      if (teamsArray.length > 0 && !selectedTeam) {
        setSelectedTeam(teamsArray[0]);
      }
    } catch (error) {
      showSnackbar('Fehler beim Laden der Teams', 'error');
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (teamId: string) => {
    try {
      const [membersData, invitationsData, joinRequestsData, leaderboardData] = await Promise.all([
        TeamService.getMembers(teamId),
        TeamService.getInvitations(teamId).catch(() => []), // May fail if not admin
        TeamService.getJoinRequests(teamId).catch(() => []), // May fail if not admin
        TeamService.getLeaderboard(teamId),
      ]);

      console.log('Team details loaded:', { membersData, invitationsData, joinRequestsData, leaderboardData });
      console.log('Current user:', state.user);
      console.log('Selected team:', selectedTeam);

      setMembers(Array.isArray(membersData) ? membersData : []);
      setInvitations(Array.isArray(invitationsData) ? invitationsData : []);
      setJoinRequests(Array.isArray(joinRequestsData) ? joinRequestsData : []);
      setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
    } catch (error) {
      console.error('Error loading team details:', error);
      // Reset to empty arrays on error
      setMembers([]);
      setInvitations([]);
      setJoinRequests([]);
      setLeaderboard([]);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      showSnackbar('Teamname ist erforderlich', 'error');
      return;
    }

    try {
      const newTeam = await TeamService.createTeam({
        name: teamName,
        description: teamDescription,
      });
      
      await loadTeams();
      setSelectedTeam(newTeam);
      setCreateDialogOpen(false);
      setTeamName('');
      setTeamDescription('');
      showSnackbar('Team erfolgreich erstellt', 'success');
    } catch (error: any) {
      let errorMessage = 'Fehler beim Erstellen des Teams';
      
      if (error.message) {
        // Übersetze häufige Fehlermeldungen
        if (error.message.includes('already in a team')) {
          errorMessage = 'Sie sind bereits Mitglied eines Teams. Ein Benutzer kann nur einem Team angehören.';
        } else if (error.message.includes('name') && error.message.includes('required')) {
          errorMessage = 'Der Teamname ist erforderlich.';
        } else if (error.message.includes('duplicate') || error.message.includes('exists')) {
          errorMessage = 'Ein Team mit diesem Namen existiert bereits.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showSnackbar(errorMessage, 'error');
      console.error('Error creating team:', error);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam || !inviteEmail.trim()) {
      showSnackbar('E-Mail-Adresse ist erforderlich', 'error');
      return;
    }

    try {
      const result = await TeamService.createInvitation(selectedTeam.id, {
        email: inviteEmail,
        role: inviteRole,
      });
      
      await loadTeamDetails(selectedTeam.id);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      
      const message = result.isNewUser 
        ? 'Neuer Account erstellt und Einladung per E-Mail gesendet'
        : 'Einladung erfolgreich versendet';
      showSnackbar(message, 'success');
    } catch (error: any) {
      let errorMessage = 'Fehler beim Versenden der Einladung';
      
      if (error.message) {
        if (error.message.includes('already in a team')) {
          errorMessage = 'Der Benutzer ist bereits Mitglied eines Teams';
        } else if (error.message.includes('already invited')) {
          errorMessage = 'Dieser Benutzer wurde bereits eingeladen';
        } else if (error.message.includes('already a member')) {
          errorMessage = 'Dieser Benutzer ist bereits Teammitglied';
        } else if (error.message.includes('invalid email')) {
          errorMessage = 'Ungültige E-Mail-Adresse';
        } else {
          errorMessage = error.message;
        }
      }
      
      showSnackbar(errorMessage, 'error');
      console.error('Error sending invitation:', error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie dieses Team löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await TeamService.deleteTeam(teamId);
      await loadTeams();
      if (selectedTeam?.id === teamId) {
        setSelectedTeam((teams || []).length > 1 ? (teams || []).find(t => t.id !== teamId) || null : null);
      }
      showSnackbar('Team erfolgreich gelöscht', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Löschen des Teams', 'error');
      console.error('Error deleting team:', error);
    }
  };

  const handleApproveJoinRequest = async (requestId: string) => {
    if (!selectedTeam) return;

    try {
      await TeamService.approveJoinRequest(selectedTeam.id, requestId);
      await loadTeamDetails(selectedTeam.id);
      showSnackbar('Beitrittsanfrage genehmigt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Genehmigen der Beitrittsanfrage', 'error');
      console.error('Error approving join request:', error);
    }
  };

  const handleRejectJoinRequest = async (requestId: string) => {
    if (!selectedTeam) return;

    try {
      await TeamService.rejectJoinRequest(selectedTeam.id, requestId);
      await loadTeamDetails(selectedTeam.id);
      showSnackbar('Beitrittsanfrage abgelehnt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Ablehnen der Beitrittsanfrage', 'error');
      console.error('Error rejecting join request:', error);
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm('Sind Sie sicher, dass Sie das Team verlassen möchten?')) {
      return;
    }

    try {
      await TeamService.leaveTeam();
      await loadTeams();
      setSelectedTeam(null);
      showSnackbar('Team erfolgreich verlassen', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Verlassen des Teams', 'error');
      console.error('Error leaving team:', error);
    }
  };

  const isTeamOwner = (team: Team) => team.owner_id === state.user?.id;
  const isTeamAdmin = (team: Team) => {
    if (!state.user?.id) {
      console.log('isTeamAdmin: No user ID');
      return false;
    }
    // Owner is always admin
    if (team.owner_id === state.user.id) {
      console.log('isTeamAdmin: User is owner');
      return true;
    }
    // Check if user is admin in members list (if loaded)
    if (Array.isArray(members) && members.length > 0) {
      const member = members.find(m => m.user_id === state.user?.id);
      const isAdmin = member?.role === 'admin' || member?.role === 'owner';
      console.log('isTeamAdmin: Checking members list', { member, isAdmin, members: members.length });
      return isAdmin;
    }
    // Default to false if members not loaded yet
    console.log('isTeamAdmin: Members not loaded yet, returning false');
    return false;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Teams
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Team erstellen
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Teams List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Meine Teams
              </Typography>
              {teams.length === 0 ? (
                <Alert severity="info">
                  Sie sind noch nicht Mitglied eines Teams. Erstellen Sie eines, um loszulegen!
                </Alert>
              ) : (
                <List>
                  {teams.map((team) => (
                    <ListItemButton
                      key={team.id}
                      selected={selectedTeam?.id === team.id}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <ListItemText
                        primary={team.name}
                        secondary={`${team.member_count || 0} members`}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          size="small"
                          label={isTeamOwner(team) ? 'Besitzer' : 'Mitglied'}
                          color={isTeamOwner(team) ? 'primary' : 'default'}
                        />
                      </ListItemSecondaryAction>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Team Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedTeam ? (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5">{selectedTeam.name}</Typography>
                  <Box display="flex" gap={1}>
                    {selectedTeam && (() => {
                      const isOwner = isTeamOwner(selectedTeam);
                      const isAdmin = isTeamAdmin(selectedTeam);
                      console.log('Permission check:', { 
                        teamOwner: selectedTeam.owner_id, 
                        currentUser: state.user?.id, 
                        isOwner, 
                        isAdmin, 
                        members: members.length,
                        showInviteButton: isOwner || isAdmin
                      });
                      return (isOwner || isAdmin);
                    })() && (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<PersonAddIcon />}
                          onClick={() => setInviteDialogOpen(true)}
                          size="small"
                        >
                          Mitglied einladen
                        </Button>
                        <IconButton
                          onClick={() => setInviteDialogOpen(true)}
                          color="primary"
                          title="Mitglied einladen"
                        >
                          <PersonAddIcon />
                        </IconButton>
                      </>
                    )}
                    {selectedTeam && isTeamOwner(selectedTeam) && (
                      <>
                        <IconButton
                          onClick={() => setEditDialogOpen(true)}
                          color="primary"
                          title="Team bearbeiten"
                        >
                          <SettingsIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteTeam(selectedTeam.id)}
                          color="error"
                          title="Team löschen"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                    {selectedTeam && !isTeamOwner(selectedTeam) && (
                      <Button
                        onClick={handleLeaveTeam}
                        color="error"
                        variant="outlined"
                        size="small"
                      >
                        Team verlassen
                      </Button>
                    )}
                  </Box>
                </Box>

                {selectedTeam.description && (
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {selectedTeam.description}
                  </Typography>
                )}

                <Tabs value={tabValue} onChange={(_, newValue) => {
                  console.log('Tab changed to:', newValue);
                  setTabValue(newValue);
                }}>
                  <Tab label="Mitglieder" />
                  <Tab label="Bestenliste" />
                  {selectedTeam && (() => {
                    const isOwner = isTeamOwner(selectedTeam);
                    const isAdmin = isTeamAdmin(selectedTeam);
                    const showAdminTabs = isOwner || isAdmin;
                    console.log('Tabs permission check:', { 
                      teamOwner: selectedTeam.owner_id, 
                      currentUser: state.user?.id, 
                      isOwner, 
                      isAdmin, 
                      members: members.length,
                      showAdminTabs,
                      currentTabValue: tabValue
                    });
                    return showAdminTabs;
                  })() && (
                    <>
                      <Tab label="Einladungen" />
                      <Tab label="Beitrittsanfragen" />
                    </>
                  )}
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                  {selectedTeam && (isTeamOwner(selectedTeam) || isTeamAdmin(selectedTeam)) && (
                    <Box mb={2}>
                      <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => setInviteDialogOpen(true)}
                        fullWidth
                      >
                        Neues Mitglied einladen
                      </Button>
                    </Box>
                  )}
                  <List>
                    {(members || []).map((member) => (
                      <ListItem key={member.user_id}>
                        <Avatar sx={{ mr: 2 }}>
                          {member.user_name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={member.user_name}
                          secondary={member.user_email}
                        />
                        <Chip
                          label={member.role}
                          size="small"
                          color={member.role === 'owner' ? 'primary' : 'default'}
                        />
                      </ListItem>
                    ))}
                    {(!members || members.length === 0) && (
                      <ListItem>
                        <ListItemText
                          primary="Keine Mitglieder gefunden"
                          secondary="Laden Sie neue Mitglieder ein, um Ihr Team zu erweitern"
                        />
                      </ListItem>
                    )}
                  </List>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <List>
                    {(leaderboard || []).map((entry, index) => (
                      <ListItem key={entry.user_id}>
                        <Box sx={{ mr: 2, minWidth: 30 }}>
                          <Typography variant="h6" color="primary">
                            #{entry.rank || index + 1}
                          </Typography>
                        </Box>
                        <Avatar sx={{ mr: 2 }}>
                          {entry.user_name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={entry.user_name}
                          secondary={`${entry.total_points} points`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </TabPanel>

                {selectedTeam && (isTeamOwner(selectedTeam) || isTeamAdmin(selectedTeam)) && (
                  <>
                    <TabPanel value={tabValue} index={2}>
                      <List>
                        {(invitations || []).map((invitation) => (
                          <ListItem key={invitation.id}>
                            <ListItemText
                              primary={invitation.invited_email}
                              secondary={`Expires: ${new Date(invitation.expires_at).toLocaleDateString()}`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                onClick={() => TeamService.revokeInvitation(selectedTeam.id, invitation.id)}
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                      {invitations.length === 0 && (
                        <Alert severity="info">Keine ausstehenden Einladungen</Alert>
                      )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={3}>
                      <List>
                        {(joinRequests || []).map((request) => (
                          <ListItem key={request.id}>
                            <ListItemText
                              primary={request.user?.full_name || request.user?.name}
                              secondary={request.message || 'No message provided'}
                            />
                            <ListItemSecondaryAction>
                              <Button
                                onClick={() => handleApproveJoinRequest(request.id)}
                                color="primary"
                                size="small"
                                sx={{ mr: 1 }}
                              >
                                Genehmigen
                              </Button>
                              <Button
                                onClick={() => handleRejectJoinRequest(request.id)}
                                color="error"
                                size="small"
                              >
                                Ablehnen
                              </Button>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                      {joinRequests.length === 0 && (
                        <Alert severity="info">Keine ausstehenden Beitrittsanfragen</Alert>
                      )}
                    </TabPanel>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="text.secondary">
                  Wählen Sie ein Team aus, um Details anzuzeigen
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Team Discovery Section */}
      {(!teams || teams.length === 0) && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Teams entdecken
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Finden Sie Teams zum Beitreten oder erstellen Sie Ihr eigenes Team.
          </Typography>
          <TeamList 
            onJoinRequestSent={loadTeams}
            currentUserTeam={selectedTeam}
          />
        </Box>
      )}

      {/* Create Team Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neues Team erstellen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Teamname"
            fullWidth
            variant="outlined"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="Beschreibung (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={teamDescription}
            onChange={(e) => setTeamDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreateTeam} variant="contained">Erstellen</Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Teammitglied einladen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="E-Mail-Adresse"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            select
            label="Rolle"
            fullWidth
            variant="outlined"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
            SelectProps={{ native: true }}
          >
            <option value="member">Mitglied</option>
            <option value="admin">Administrator</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleInviteMember} variant="contained">Einladung senden</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Teams;
