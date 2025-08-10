import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Description as DescriptionIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { CommunityInitiative, CommunityInitiativeStatus } from '../../types/community';
import { MarkdownRenderer } from '../Workspace/MarkdownRenderer';
import { MarkdownEditor } from '../Workspace/MarkdownEditor';

interface InitiativeViewProps {
  initiative: CommunityInitiative;
  onUpdate?: (initiative: CommunityInitiative) => void;
  onStatusChange?: (initiativeId: string, status: CommunityInitiativeStatus, submissionDetails?: any) => void;
  readOnly?: boolean;
}

const statusConfig: Record<CommunityInitiativeStatus, {
  label: string;
  color: 'default' | 'warning' | 'success';
  description: string;
}> = {
  draft: {
    label: 'Entwurf',
    color: 'default' as const,
    description: 'Initiative wird noch bearbeitet'
  },
  refining: {
    label: 'Überarbeitung',
    color: 'warning' as const,
    description: 'Initiative wird verfeinert'
  },
  submitted: {
    label: 'Eingereicht',
    color: 'success' as const,
    description: 'Initiative wurde eingereicht'
  }
};

const targetAudienceOptions = [
  'BDEW',
  'Regulierungsbehörde',
  'Standardisierungsgremium',
  'EDI@Energy',
  'VDE|FNN',
  'Bundesnetzagentur',
  'Andere'
];

export const InitiativeView: React.FC<InitiativeViewProps> = ({
  initiative,
  onUpdate,
  onStatusChange,
  readOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(initiative.title);
  const [editedTargetAudience, setEditedTargetAudience] = useState(initiative.target_audience || '');
  const [editedDraftContent, setEditedDraftContent] = useState(initiative.draft_content);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState({
    contact_person: '',
    contact_email: '',
    additional_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSave = async () => {
    if (!onUpdate) return;

    setLoading(true);
    try {
      const updatedInitiative = {
        ...initiative,
        title: editedTitle,
        target_audience: editedTargetAudience,
        draft_content: editedDraftContent
      };

      await onUpdate(updatedInitiative);
      setIsEditing(false);
      showSnackbar('Initiative erfolgreich aktualisiert');
    } catch (error) {
      console.error('Error updating initiative:', error);
      showSnackbar('Fehler beim Aktualisieren der Initiative', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedTitle(initiative.title);
    setEditedTargetAudience(initiative.target_audience || '');
    setEditedDraftContent(initiative.draft_content);
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus: CommunityInitiativeStatus) => {
    if (!onStatusChange) return;

    if (newStatus === 'submitted') {
      setIsSubmitDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      await onStatusChange(initiative.id, newStatus);
      showSnackbar(`Status geändert zu: ${statusConfig[newStatus].label}`);
    } catch (error) {
      console.error('Error changing status:', error);
      showSnackbar('Fehler beim Ändern des Status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!onStatusChange) return;

    setLoading(true);
    try {
      await onStatusChange(initiative.id, 'submitted', submissionDetails);
      setIsSubmitDialogOpen(false);
      showSnackbar('Initiative erfolgreich eingereicht!');
    } catch (error) {
      console.error('Error submitting initiative:', error);
      showSnackbar('Fehler beim Einreichen der Initiative', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStatusTransitions = () => {
    switch (initiative.status) {
      case 'draft':
        return ['refining', 'submitted'];
      case 'refining':
        return ['draft', 'submitted'];
      case 'submitted':
        return []; // No transitions from submitted
      default:
        return [];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            {isEditing ? (
              <TextField
                fullWidth
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                variant="outlined"
                placeholder="Initiative Titel"
                sx={{ mb: 1 }}
              />
            ) : (
              <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
                <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {initiative.title}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={statusConfig[initiative.status].label}
                color={statusConfig[initiative.status].color}
                size="small"
              />
              {initiative.target_audience && (
                <Chip
                  icon={<GroupIcon />}
                  label={initiative.target_audience}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              {statusConfig[initiative.status].description}
            </Typography>
          </Box>

          {!readOnly && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isEditing && initiative.status !== 'submitted' && (
                <Tooltip title="Initiative bearbeiten">
                  <IconButton onClick={() => setIsEditing(true)} size="small">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {/* Target Audience (when editing) */}
        {isEditing && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Zielgruppe</InputLabel>
            <Select
              value={editedTargetAudience}
              onChange={(e) => setEditedTargetAudience(e.target.value)}
              label="Zielgruppe"
            >
              {targetAudienceOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Draft Content */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ mr: 1 }} />
            Initiative Entwurf
          </Typography>
          
          {isEditing ? (
            <MarkdownEditor
              value={editedDraftContent}
              onChange={setEditedDraftContent}
              placeholder="Bearbeiten Sie den Initiative-Entwurf..."
              minHeight={300}
            />
          ) : (
            <Card variant="outlined">
              <CardContent>
                <MarkdownRenderer content={initiative.draft_content} />
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Action Buttons */}
        {!readOnly && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {isEditing ? (
              <>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                  startIcon={<SaveIcon />}
                >
                  Speichern
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={loading}
                  startIcon={<CancelIcon />}
                >
                  Abbrechen
                </Button>
              </>
            ) : (
              <>
                {getAvailableStatusTransitions().map((status) => (
                  <Button
                    key={status}
                    variant={status === 'submitted' ? 'contained' : 'outlined'}
                    onClick={() => handleStatusChange(status as CommunityInitiativeStatus)}
                    disabled={loading}
                    startIcon={status === 'submitted' ? <SendIcon /> : <TimelineIcon />}
                    color={status === 'submitted' ? 'primary' : 'secondary'}
                  >
                    {status === 'submitted' ? 'Einreichen' : `Zu ${statusConfig[status as CommunityInitiativeStatus].label}`}
                  </Button>
                ))}
              </>
            )}
          </Box>
        )}

        {/* Metadata */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Erstellt: {formatDate(initiative.created_at)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Aktualisiert: {formatDate(initiative.updated_at)}
          </Typography>
          {initiative.submitted_at && (
            <Typography variant="caption" color="text.secondary">
              Eingereicht: {formatDate(initiative.submitted_at)}
            </Typography>
          )}
        </Box>
      </CardContent>

      {/* Submit Dialog */}
      <Dialog
        open={isSubmitDialogOpen}
        onClose={() => setIsSubmitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Initiative einreichen</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Nach der Einreichung kann die Initiative nicht mehr bearbeitet werden.
          </Alert>
          
          <TextField
            fullWidth
            label="Kontaktperson"
            value={submissionDetails.contact_person}
            onChange={(e) => setSubmissionDetails(prev => ({
              ...prev,
              contact_person: e.target.value
            }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Kontakt E-Mail"
            type="email"
            value={submissionDetails.contact_email}
            onChange={(e) => setSubmissionDetails(prev => ({
              ...prev,
              contact_email: e.target.value
            }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Zusätzliche Anmerkungen"
            multiline
            rows={3}
            value={submissionDetails.additional_notes}
            onChange={(e) => setSubmissionDetails(prev => ({
              ...prev,
              additional_notes: e.target.value
            }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSubmitDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !submissionDetails.contact_person || !submissionDetails.contact_email}
            startIcon={<SendIcon />}
          >
            Einreichen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};
