// Notes Editor für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Komponente zur Verwaltung von Notizen in Klärfällen

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Avatar,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PushPin as PinIcon,
  PushPinOutlined as UnpinIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Note as NoteIcon
} from '@mui/icons-material';

// Types
import { 
  ClarificationNote, 
  NoteType, 
  AddNoteRequest 
} from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';

interface NotesEditorProps {
  clarificationId: string;
  readOnly?: boolean;
  onNotesChange?: () => void;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  clarificationId,
  readOnly = false,
  onNotesChange
}) => {
  const [notes, setNotes] = useState<ClarificationNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClarificationNote | null>(null);
  const [formData, setFormData] = useState<AddNoteRequest>({
    content: '',
    noteType: 'USER',
    isInternal: false,
    isPinned: false,
    tags: []
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [clarificationId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await bilateralClarificationService.getNotes(clarificationId);
      setNotes(data);
    } catch (err) {
      setError('Fehler beim Laden der Notizen');
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await bilateralClarificationService.addNote(clarificationId, formData);
      setNotes(prev => [newNote, ...prev]);
      setDialogOpen(false);
      resetForm();
      onNotesChange?.();
    } catch (err) {
      setError('Fehler beim Erstellen der Notiz');
      console.error('Error creating note:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      content: '',
      noteType: 'USER',
      isInternal: false,
      isPinned: false,
      tags: []
    });
    setEditingNote(null);
  };

  const handleEditNote = (note: ClarificationNote) => {
    setEditingNote(note);
    setFormData({
      content: note.content,
      noteType: note.noteType,
      isInternal: note.isInternal || false,
      isPinned: note.isPinned || false,
      tags: note.tags || []
    });
    setDialogOpen(true);
  };

  const getNoteTypeLabel = (type: NoteType) => {
    switch (type) {
      case 'USER': return 'Benutzer';
      case 'SYSTEM': return 'System';
      case 'AI_SUGGESTION': return 'KI-Vorschlag';
      case 'STATUS_CHANGE': return 'Status-Änderung';
      case 'COMMUNICATION': return 'Kommunikation';
      default: return type;
    }
  };

  const getNoteTypeColor = (type: NoteType) => {
    switch (type) {
      case 'USER': return 'primary';
      case 'SYSTEM': return 'secondary';
      case 'AI_SUGGESTION': return 'info';
      case 'STATUS_CHANGE': return 'warning';
      case 'COMMUNICATION': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sortedNotes = notes.sort((a, b) => {
    // Pinned notes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Notizen ({notes.length})
        </Typography>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            size="small"
          >
            Neue Notiz
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <List>
        {sortedNotes.map((note) => (
          <React.Fragment key={note.id}>
            <ListItem 
              alignItems="flex-start"
              sx={{ 
                bgcolor: note.isPinned ? 'action.hover' : 'transparent',
                borderRadius: 1,
                mb: 1
              }}
            >
              <Avatar sx={{ mr: 2, mt: 1 }}>
                {note.noteType === 'AI_SUGGESTION' ? 'AI' : 
                 note.createdBy?.charAt(0) || 'U'}
              </Avatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="subtitle2">
                      {note.createdBy || 'Unbekannt'}
                    </Typography>
                    <Chip 
                      label={getNoteTypeLabel(note.noteType)} 
                      size="small" 
                      color={getNoteTypeColor(note.noteType)}
                    />
                    {note.isInternal && (
                      <Chip 
                        label="Intern" 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                    {note.isPinned && (
                      <PinIcon color="action" fontSize="small" />
                    )}
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(note.createdAt)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                      {note.content}
                    </Typography>
                    {note.tags && note.tags.length > 0 && (
                      <Box display="flex" gap={0.5} mt={1} flexWrap="wrap">
                        {note.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box display="flex" flexDirection="column" gap={1}>
                  {!readOnly && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleEditNote(note)}
                        title="Bearbeiten"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Löschen"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      {notes.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <NoteIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="body1" color="textSecondary">
            Keine Notizen vorhanden
          </Typography>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingNote ? 'Notiz bearbeiten' : 'Neue Notiz erstellen'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Inhalt"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            fullWidth
            multiline
            rows={6}
            sx={{ mb: 2, mt: 1 }}
            placeholder="Notiz-Inhalt eingeben..."
          />

          <Box display="flex" gap={2} mb={2}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Typ</InputLabel>
              <Select
                value={formData.noteType}
                onChange={(e) => setFormData(prev => ({ ...prev, noteType: e.target.value as NoteType }))}
              >
                <MenuItem value="USER">Benutzer-Notiz</MenuItem>
                <MenuItem value="COMMUNICATION">Kommunikation</MenuItem>
                <MenuItem value="STATUS_CHANGE">Status-Änderung</MenuItem>
              </Select>
            </FormControl>

            <Box display="flex" flexDirection="column" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isInternal || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, isInternal: e.target.checked }))}
                  />
                }
                label="Interne Notiz"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPinned || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                  />
                }
                label="Anheften"
              />
            </Box>
          </Box>

          <TextField
            label="Tags (kommagetrennt)"
            value={formData.tags?.join(', ') || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) 
            }))}
            fullWidth
            placeholder="z.B. wichtig, follow-up, technisch"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDialogOpen(false);
              resetForm();
            }}
            startIcon={<CancelIcon />}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateNote} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!formData.content.trim()}
          >
            {editingNote ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
