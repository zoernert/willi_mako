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
  Typography,
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import TeamService from '../../services/teamService';

interface TeamInviteModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  onInviteSent: () => void;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  open,
  onClose,
  teamId,
  teamName,
  onInviteSent,
}) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showSnackbar } = useSnackbar();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('E-Mail-Adresse ist erforderlich');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await TeamService.inviteUser(teamId, {
        email: email.trim(),
        message: message.trim() || undefined,
      });
      
      showSnackbar('Einladung erfolgreich versendet!', 'success');
      setEmail('');
      setMessage('');
      onInviteSent();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Fehler beim Versenden der Einladung');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setMessage('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAddIcon />
            Mitglied zu "{teamName}" einladen
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <Typography variant="body2" color="text.secondary">
              Laden Sie einen Kollegen zu Ihrem Team ein. Die Person erhält eine E-Mail 
              mit einem Einladungslink.
            </Typography>
            
            <TextField
              label="E-Mail-Adresse"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              disabled={loading}
              placeholder="kollege@unternehmen.de"
              helperText="Die E-Mail-Adresse der Person, die Sie einladen möchten"
            />
            
            <TextField
              label="Persönliche Nachricht (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
              placeholder="Hallo! Ich lade dich zu unserem Wissensaustausch-Team ein..."
              helperText="Diese Nachricht wird in der Einladungs-E-Mail angezeigt"
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
            disabled={loading || !email.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <PersonAddIcon />}
          >
            {loading ? 'Sende...' : 'Einladung senden'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TeamInviteModal;
