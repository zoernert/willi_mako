// Team Share Dialog für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Dialog zur Freigabe von Klärfällen für Teams

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Share as ShareIcon,
  Close as CloseIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Remove as RemoveIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Types
import { BilateralClarification } from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';

interface TeamShareDialogProps {
  open: boolean;
  clarification: BilateralClarification | null;
  onClose: () => void;
  onUpdate: () => void;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const TeamShareDialog: React.FC<TeamShareDialogProps> = ({
  open,
  clarification,
  onClose,
  onUpdate
}) => {
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [shareNote, setShareNote] = useState('');
  const [allowEdit, setAllowEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedTeams, setSharedTeams] = useState<Team[]>([]);

  // Mock data for teams (in real implementation, fetch from API)
  useEffect(() => {
    if (open) {
      loadTeams();
      loadSharedTeams();
    }
  }, [open, clarification]);

  const loadTeams = async () => {
    // Mock implementation - replace with actual API call
    const mockTeams: Team[] = [
      {
        id: 'team1',
        name: 'Marktkommunikation',
        description: 'Team für allgemeine Marktkommunikation',
        memberCount: 8
      },
      {
        id: 'team2',
        name: 'Technisches Team',
        description: 'Technische Klärfälle und EDIFACT',
        memberCount: 5
      },
      {
        id: 'team3',
        name: 'Billing Team',
        description: 'Abrechnungsrelevante Klärfälle',
        memberCount: 6
      },
      {
        id: 'team4',
        name: 'Compliance Team',
        description: 'Rechtliche und regulatorische Themen',
        memberCount: 4
      }
    ];
    setAvailableTeams(mockTeams);
  };

  const loadSharedTeams = async () => {
    if (!clarification?.sharedWithTeam) {
      setSharedTeams([]);
      return;
    }
    
    // Mock implementation - in real app, get actual shared teams
    const mockSharedTeams: Team[] = [
      {
        id: 'team1',
        name: 'Marktkommunikation',
        description: 'Team für allgemeine Marktkommunikation',
        memberCount: 8
      }
    ];
    setSharedTeams(mockSharedTeams);
  };

  const handleShare = async () => {
    if (!clarification || !selectedTeam) return;

    setLoading(true);
    setError(null);

    try {
      await bilateralClarificationService.shareWithTeam(clarification.id.toString());
      
      // Add to shared teams list
      const team = availableTeams.find(t => t.id === selectedTeam);
      if (team) {
        setSharedTeams(prev => [...prev, team]);
      }
      
      setSelectedTeam('');
      setShareNote('');
      onUpdate();
    } catch (err) {
      setError('Fehler beim Teilen mit Team');
      console.error('Error sharing with team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (teamId: string) => {
    if (!clarification) return;

    setLoading(true);
    try {
      await bilateralClarificationService.unshareFromTeam(clarification.id.toString());
      setSharedTeams(prev => prev.filter(t => t.id !== teamId));
      onUpdate();
    } catch (err) {
      setError('Fehler beim Entfernen der Team-Freigabe');
      console.error('Error unsharing from team:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTeamIcon = (teamName: string) => {
    if (teamName.toLowerCase().includes('technisch')) return '🔧';
    if (teamName.toLowerCase().includes('billing')) return '💰';
    if (teamName.toLowerCase().includes('compliance')) return '⚖️';
    return '👥';
  };

  if (!clarification) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareIcon />
        <Typography variant="h6">Team-Freigabe verwalten</Typography>
        <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
          {clarification.title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Current shared teams */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Aktuell freigegebene Teams ({sharedTeams.length})
          </Typography>
          
          {sharedTeams.length > 0 ? (
            <List>
              {sharedTeams.map((team) => (
                <React.Fragment key={team.id}>
                  <ListItem>
                    <Box display="flex" alignItems="center" mr={2}>
                      <Typography sx={{ fontSize: '1.5rem' }}>
                        {getTeamIcon(team.name)}
                      </Typography>
                    </Box>
                    <ListItemText
                      primary={team.name}
                      secondary={`${team.memberCount} Mitglieder • ${team.description}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleUnshare(team.id)}
                        disabled={loading}
                        title="Freigabe entfernen"
                      >
                        <RemoveIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={2}>
              <GroupIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography variant="body2" color="textSecondary">
                Noch nicht mit Teams geteilt
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Add new team share */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Mit weiterem Team teilen
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Team auswählen</InputLabel>
            <Select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={loading}
            >
              {availableTeams
                .filter(team => !sharedTeams.some(shared => shared.id === team.id))
                .map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography>{getTeamIcon(team.name)}</Typography>
                    <Box>
                      <Typography variant="body1">{team.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {team.memberCount} Mitglieder
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Notiz für das Team (optional)"
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
            placeholder="z.B. Benötige Unterstützung bei technischen Aspekten..."
          />

          <FormControlLabel
            control={
              <Switch
                checked={allowEdit}
                onChange={(e) => setAllowEdit(e.target.checked)}
              />
            }
            label="Team darf Klärfall bearbeiten"
          />

          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              onClick={handleShare}
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!selectedTeam || loading}
            >
              Mit Team teilen
            </Button>
          </Box>
        </Box>

        {/* Info box */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            💡 <strong>Hinweis:</strong> Geteilte Klärfälle sind für alle Team-Mitglieder sichtbar. 
            Team-Mitglieder können Kommentare hinzufügen und bei entsprechender Berechtigung den Fall bearbeiten.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
