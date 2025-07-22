import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip
} from '@mui/material';
import {
  NoteAdd as NoteIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { notesApi } from '../../services/notesApi';
import { Note } from '../../types/workspace';

interface QuickNoteButtonProps {
  sourceType: 'chat' | 'faq';
  sourceId: string;
  selectedText?: string;
  position?: 'fixed' | 'relative';
}

const QuickNoteButton: React.FC<QuickNoteButtonProps> = ({
  sourceType,
  sourceId,
  selectedText,
  position = 'fixed'
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState(selectedText || '');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const { showSnackbar } = useSnackbar();

  const handleCreateNote = async () => {
    if (!noteContent.trim()) {
      showSnackbar('Notiz-Inhalt ist erforderlich', 'error');
      return;
    }

    try {
      setSaving(true);
      
      const noteData: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
        title: noteTitle || 'Schnelle Notiz',
        content: noteContent,
        source_type: sourceType,
        source_id: sourceId,
        source_context: selectedText,
        tags: noteTags
      };

      await notesApi.createNote(noteData);
      
      showSnackbar('Notiz erfolgreich erstellt', 'success');
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating note:', err);
      showSnackbar('Fehler beim Erstellen der Notiz', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNoteTitle('');
    setNoteContent(selectedText || '');
    setNoteTags([]);
    setNewTag('');
  };

  const handleAddTag = () => {
    if (newTag && !noteTags.includes(newTag)) {
      setNoteTags([...noteTags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter(tag => tag !== tagToRemove));
  };

  const fabStyles = position === 'fixed' ? {
    position: 'fixed',
    bottom: 80,
    right: 16,
    zIndex: 1000
  } : {};

  return (
    <>
      <Fab
        color="secondary"
        aria-label="add note"
        size="small"
        sx={fabStyles}
        onClick={() => setIsDialogOpen(true)}
      >
        <NoteIcon />
      </Fab>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Schnelle Notiz erstellen
        </DialogTitle>
        <DialogContent>
          {selectedText && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Ausgewählter Text:
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                "{selectedText}"
              </Typography>
            </Box>
          )}

          <TextField
            margin="dense"
            label="Titel (optional)"
            fullWidth
            variant="outlined"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Notiz-Inhalt"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            sx={{ mb: 2 }}
            required
          />

          {/* Tags */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Tags (optional)</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {noteTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Tag hinzufügen"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                sx={{ flexGrow: 1 }}
              />
              <Button onClick={handleAddTag} variant="outlined" size="small">
                Hinzufügen
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleCreateNote}
            variant="contained"
            disabled={saving || !noteContent.trim()}
          >
            {saving ? 'Speichern...' : 'Notiz erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickNoteButton;
