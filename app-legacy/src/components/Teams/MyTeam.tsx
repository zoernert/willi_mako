import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  AdminPanelSettings as AdminIcon,
  ExitToApp as LeaveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';
import TeamService, { Team, TeamMember } from '../../services/teamService';
import TeamInviteModal from './TeamInviteModal';
import TeamLeaderboard from './TeamLeaderboard';

interface MyTeamProps {
  team: Team;
  onTeamLeft: () => void;
  onTeamUpdated: () => void;
}

export const MyTeam: React.FC<MyTeamProps> = ({ team, onTeamLeft, onTeamUpdated }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [memberMenuAnchor, setMemberMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { showSnackbar } = useSnackbar();
  const { state } = useAuth();
  const user = state.user;

  const isOwner = user?.id === team.owner_id;
  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin' || isOwner;

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await TeamService.getMembers(team.id);
      setMembers(data);
    } catch (error: any) {
      setError(error.message || 'Fehler beim Laden der Mitglieder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [team.id]);

  const handleLeaveTeam = async () => {
    setLeaving(true);
    try {
      await TeamService.leaveTeam();
      showSnackbar('Sie haben das Team verlassen', 'success');
      onTeamLeft();
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Verlassen des Teams', 'error');
    } finally {
      setLeaving(false);
      setLeaveDialogOpen(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await TeamService.removeMember(team.id, memberId);
      showSnackbar('Mitglied erfolgreich entfernt', 'success');
      loadMembers();
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Entfernen des Mitglieds', 'error');
    }
    handleCloseMemberMenu();
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    try {
      await TeamService.updateMemberRole(team.id, memberId, 'admin');
      showSnackbar('Mitglied zu Admin befördert', 'success');
      loadMembers();
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Befördern des Mitglieds', 'error');
    }
    handleCloseMemberMenu();
  };

  const handleDemoteFromAdmin = async (memberId: string) => {
    try {
      await TeamService.updateMemberRole(team.id, memberId, 'member');
      showSnackbar('Admin-Rechte entfernt', 'success');
      loadMembers();
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Entfernen der Admin-Rechte', 'error');
    }
    handleCloseMemberMenu();
  };

  const handleInviteSent = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMemberMenuClick = (event: React.MouseEvent<HTMLElement>, member: TeamMember) => {
    setMemberMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleCloseMemberMenu = () => {
    setMemberMenuAnchor(null);
    setSelectedMember(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'primary';
      case 'admin':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Besitzer';
      case 'admin':
        return 'Admin';
      default:
        return 'Mitglied';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h5" component="h2" gutterBottom>
                {team.name}
              </Typography>
              {team.description && (
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {team.description}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {members.length} Mitglied{members.length !== 1 ? 'er' : ''}
              </Typography>
            </Box>
            
            <Box display="flex" gap={1}>
              {isAdmin && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setInviteModalOpen(true)}
                >
                  Einladen
                </Button>
              )}
              
              {!isOwner && (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<LeaveIcon />}
                  onClick={() => setLeaveDialogOpen(true)}
                >
                  Verlassen
                </Button>
              )}
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Mitglieder
          </Typography>
          
          <List>
            {members.map((member) => (
              <ListItem
                key={member.user_id}
                secondaryAction={
                  isAdmin && member.user_id !== user?.id && member.role !== 'owner' ? (
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMemberMenuClick(e, member)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <Avatar>
                    {member.user_name?.charAt(0).toUpperCase() || '?'}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography>
                        {member.user_name || `User ${member.user_id}`}
                      </Typography>
                      {member.user_id === user?.id && (
                        <Chip label="Du" size="small" />
                      )}
                      <Chip
                        label={getRoleLabel(member.role)}
                        size="small"
                        color={getRoleColor(member.role) as any}
                      />
                    </Box>
                  }
                  secondary={member.user_email}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Team Leaderboard */}
      <Box mt={3}>
        <TeamLeaderboard teamId={team.id} refreshTrigger={refreshTrigger} />
      </Box>

      {/* Invite Modal */}
      <TeamInviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        teamId={team.id}
        teamName={team.name}
        onInviteSent={handleInviteSent}
      />

      {/* Leave Team Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>Team verlassen</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie das Team "{team.name}" verlassen möchten?
            Sie verlieren den Zugriff auf alle Team-Dokumente und die Bestenliste.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)} disabled={leaving}>
            Abbrechen
          </Button>
          <Button
            onClick={handleLeaveTeam}
            color="error"
            disabled={leaving}
            startIcon={leaving && <CircularProgress size={20} />}
          >
            {leaving ? 'Verlasse...' : 'Team verlassen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Management Menu */}
      <Menu
        anchorEl={memberMenuAnchor}
        open={Boolean(memberMenuAnchor)}
        onClose={handleCloseMemberMenu}
      >
        {selectedMember?.role === 'member' && (
          <MenuItem onClick={() => handlePromoteToAdmin(selectedMember.user_id)}>
            <AdminIcon sx={{ mr: 1 }} />
            Zu Admin befördern
          </MenuItem>
        )}
        
        {selectedMember?.role === 'admin' && (
          <MenuItem onClick={() => handleDemoteFromAdmin(selectedMember.user_id)}>
            <AdminIcon sx={{ mr: 1 }} />
            Admin-Rechte entziehen
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => selectedMember && handleRemoveMember(selectedMember.user_id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Aus Team entfernen
        </MenuItem>
      </Menu>
    </>
  );
};

export default MyTeam;
