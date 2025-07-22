import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Box
} from '@mui/material';
import {
  NoteAdd as NoteAddIcon,
  PlaylistAdd as PlaylistAddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { notesApi } from '../../services/notesApi';
import { Note } from '../../types/workspace';

interface TextSelectionMenuProps {
  anchorEl: HTMLElement | null;
  selectedText: string;
  sourceType: 'chat' | 'faq';
  sourceId: string;
  sourceContext?: string;
  onClose: () => void;
}

const TextSelectionMenu: React.FC<TextSelectionMenuProps> = ({
  anchorEl,
  selectedText,
  sourceType,
  sourceId,
  sourceContext,
  onClose
}) => {
  const [createNoteDialog, setCreateNoteDialog] = useState(false);
  const [addToNoteDialog, setAddToNoteDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (addToNoteDialog) {
      fetchUserNotes();
    }
  }, [addToNoteDialog]);

  useEffect(() => {
    if (createNoteDialog || addToNoteDialog) {
      fetchAvailableTags();
    }
  }, [createNoteDialog, addToNoteDialog]);

  // Debug: Log when selectedText changes
  useEffect(() => {
    console.log('TextSelectionMenu received selectedText:', selectedText);
  }, [selectedText]);

  const fetchUserNotes = async () => {
    try {
      const data = await notesApi.getNotes();
      setAvailableNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const data = await notesApi.getTags();
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleCreateNewNote = () => {
    console.log('Creating new note with selected text:', selectedText);
    setNoteTitle('');
    setNoteContent(selectedText);
    setNoteTags([]);
    setCreateNoteDialog(true);
    // Don't close the menu immediately - wait for dialog to open
  };

  const handleAddToExistingNote = () => {
    setSelectedNote(null);
    setAddToNoteDialog(true);
    onClose();
  };

  const handleSaveNewNote = async () => {
    if (!noteContent.trim()) {
      showSnackbar('Notiz-Inhalt ist erforderlich', 'error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const noteData = {
        title: noteTitle || 'Neue Notiz',
        content: noteContent,
        tags: noteTags,
        source_type: sourceType,
        source_id: sourceId,
        source_context: sourceContext
      };

      const newNote = await notesApi.createNote(noteData);
      
      if (newNote) {
        showSnackbar('Notiz erfolgreich erstellt', 'success');
        setCreateNoteDialog(false);
        setNoteTitle('');
        setNoteContent('');
        setNoteTags([]);
        onClose(); // Close the menu after successful save
      } else {
        throw new Error('Failed to create note');
      }
    } catch (error) {
      console.error('Error creating note:', error);
      showSnackbar('Fehler beim Erstellen der Notiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToNote = async () => {
    if (!selectedNote) {
      showSnackbar('Bitte wählen Sie eine Notiz aus', 'error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Add the selected text to the existing note with a separator
      const updatedContent = selectedNote.content + '\n\n---\n\n' + selectedText;
      
      const noteData = {
        content: updatedContent,
        source_type: sourceType,
        source_id: sourceId,
        source_context: sourceContext
      };

      const updatedNote = await notesApi.updateNote(selectedNote.id, noteData);
      
      if (updatedNote) {
        showSnackbar('Text zur Notiz hinzugefügt', 'success');
        setAddToNoteDialog(false);
        setSelectedNote(null);
        onClose();
      } else {
        throw new Error('Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      showSnackbar('Fehler beim Hinzufügen zur Notiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <MenuItem onClick={handleCreateNewNote}>
          <ListItemIcon>
            <NoteAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Neue Notiz erstellen" />
        </MenuItem>
        <MenuItem onClick={handleAddToExistingNote}>
          <ListItemIcon>
            <PlaylistAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Zu bestehender Notiz hinzufügen" />
        </MenuItem>
      </Menu>

      {/* Create New Note Dialog */}
      <Dialog 
        open={createNoteDialog} 
        onClose={() => {
          setCreateNoteDialog(false);
          onClose(); // Close the menu when dialog closes
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Neue Notiz aus ausgewähltem Text erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titel (optional)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              fullWidth
              variant="outlined"
            />
            
            <TextField
              label="Inhalt"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              multiline
              rows={6}
              fullWidth
              variant="outlined"
              required
            />

            <Autocomplete
              multiple
              freeSolo
              options={availableTags}
              value={noteTags}
              onChange={(_, newValue) => setNoteTags(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Tags hinzufügen..."
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setCreateNoteDialog(false);
              onClose(); // Close menu when canceling
            }}
            startIcon={<CancelIcon />}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveNewNote}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            Notiz erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add to Existing Note Dialog */}
      <Dialog 
        open={addToNoteDialog} 
        onClose={() => setAddToNoteDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Zu bestehender Notiz hinzufügen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Autocomplete
              options={availableNotes}
              getOptionLabel={(option) => option.title || 'Unbenannte Notiz'}
              value={selectedNote}
              onChange={(_, newValue) => setSelectedNote(newValue)}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <div style={{ fontWeight: 'bold' }}>
                      {option.title || 'Unbenannte Notiz'}
                    </div>
                    <div style={{ fontSize: '0.85em', color: 'gray', marginTop: '4px' }}>
                      {option.content.slice(0, 100)}...
                    </div>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Notiz auswählen"
                  placeholder="Suchen Sie nach einer Notiz..."
                />
              )}
            />

            <TextField
              label="Hinzuzufügender Text"
              value={selectedText}
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              disabled
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAddToNoteDialog(false)}
            startIcon={<CancelIcon />}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddToNote}
            variant="contained"
            startIcon={<PlaylistAddIcon />}
            disabled={loading || !selectedNote}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TextSelectionMenu;
