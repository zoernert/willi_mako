import React, { useState } from 'react';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  Tooltip
} from '@mui/material';
import {
  NoteAdd as NoteIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { notesApi } from '../../services/notesApi';
import { Note } from '../../types/workspace';
import { useLocation, useParams } from 'react-router-dom';

const HeaderQuickNoteButton: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const { showSnackbar } = useSnackbar();
  const location = useLocation();
  const { chatId } = useParams<{ chatId?: string }>();

  // Determine source type and ID based on current route
  const getSourceInfo = () => {
    const path = location.pathname;
    if (path.startsWith('/chat') && chatId) {
      return { sourceType: 'chat' as const, sourceId: chatId };
    }
    if (path.startsWith('/faq/')) {
      const faqId = path.split('/faq/')[1];
      return { sourceType: 'faq' as const, sourceId: faqId };
    }
    // Default to manual note with no source_id
    return { sourceType: 'manual' as const, sourceId: undefined };
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim()) {
      showSnackbar('Notiz-Inhalt ist erforderlich', 'error');
      return;
    }

    try {
      setSaving(true);
      
      const { sourceType, sourceId } = getSourceInfo();
      
      const noteData: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
        title: noteTitle || 'Neue Notiz',
        content: noteContent,
        source_type: sourceType,
        source_id: sourceId,
        source_context: undefined,
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
    setNoteContent('');
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

  return (
    <>
      <Tooltip title="Neue Notiz erstellen" arrow>
        <IconButton
          color="inherit"
          onClick={() => setIsDialogOpen(true)}
          sx={{ mr: 1 }}
        >
          <NoteIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Neue Notiz erstellen
        </DialogTitle>
        <DialogContent>
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

export default HeaderQuickNoteButton;
