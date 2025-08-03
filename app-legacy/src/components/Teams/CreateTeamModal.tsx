import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import TeamService from '../../services/teamService';

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onTeamCreated: () => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  open,
  onClose,
  onTeamCreated,
}) => {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showSnackbar } = useSnackbar();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Team-Name ist erforderlich');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await TeamService.createTeam({ name: teamName.trim(), description: description.trim() });
      showSnackbar('Team erfolgreich erstellt!', 'success');
      setTeamName('');
      setDescription('');
      onTeamCreated();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Fehler beim Erstellen des Teams');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTeamName('');
      setDescription('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Neues Team erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <TextField
              label="Team-Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              fullWidth
              required
              disabled={loading}
              placeholder="z.B. Marktkommunikation Team"
            />
            
            <TextField
              label="Beschreibung (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
              placeholder="Kurze Beschreibung des Teams..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !teamName.trim()}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Erstelle...' : 'Team erstellen'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateTeamModal;
