import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import TeamService, { Team } from '../../services/teamService';

interface JoinRequestDialogProps {
  open: boolean;
  onClose: () => void;
  team: Team;
  onSuccess?: () => void;
}

const JoinRequestDialog: React.FC<JoinRequestDialogProps> = ({
  open,
  onClose,
  team,
  onSuccess,
}) => {
  const { showSnackbar } = useSnackbar();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await TeamService.createJoinRequest(team.id, message.trim() || undefined);
      showSnackbar('Join request sent successfully', 'success');
      setMessage('');
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error sending join request:', error);
      showSnackbar(error.message || 'Failed to send join request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Request to Join Team
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" color="primary">
            {team.name}
          </Typography>
          {team.description && (
            <Typography variant="body2" color="text.secondary">
              {team.description}
            </Typography>
          )}
        </Box>
        
        <TextField
          label="Message (Optional)"
          placeholder="Tell the team administrators why you'd like to join..."
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
          sx={{ mt: 2 }}
        />
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Your join request will be sent to the team administrators for approval.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={submitting}
          sx={{ minWidth: 100 }}
        >
          {submitting ? <CircularProgress size={20} /> : 'Send Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JoinRequestDialog;
