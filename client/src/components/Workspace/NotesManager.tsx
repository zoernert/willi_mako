import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Link as LinkIcon,
  Tag as TagIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { notesApi } from '../../services/notesApi';
import { Note } from '../../types/workspace';

interface NotesManagerProps {
  onStatsUpdate: () => void;
}

const NotesManager: React.FC<NotesManagerProps> = ({ onStatsUpdate }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Dialog states
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const { showSnackbar } = useSnackbar();

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedTags.length > 0 && { tags: selectedTags }),
        ...(sourceFilter !== 'all' && { source_type: sourceFilter })
      };

      const data = await notesApi.getNotes(params);
      setNotes(data.notes || []);
      setTotalPages(Math.ceil((data.total || 0) / 10));
    } catch (err) {
      showSnackbar('Fehler beim Laden der Notizen', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTags, sourceFilter, currentPage, showSnackbar]);

  const fetchAvailableTags = async () => {
    try {
      const tags = await notesApi.getAvailableTags();
      setAvailableTags(tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchAvailableTags();
  }, [fetchNotes]); // fetchAvailableTags is now a stable function

  const handleCreateNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setIsNoteDialogOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags);
    setIsNoteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesApi.deleteNote(noteId);
      showSnackbar('Notiz erfolgreich gelöscht', 'success');
      fetchNotes();
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Löschen der Notiz', 'error');
    }
    setAnchorEl(null);
  };

  const handleSaveNote = async () => {
    try {
      const noteData = {
        title: noteTitle,
        content: noteContent,
        tags: noteTags
      };

      if (editingNote) {
        await notesApi.updateNote(editingNote.id, noteData);
        showSnackbar('Notiz erfolgreich aktualisiert', 'success');
      } else {
        await notesApi.createNote(noteData);
        showSnackbar('Notiz erfolgreich erstellt', 'success');
      }

      setIsNoteDialogOpen(false);
      fetchNotes();
      fetchAvailableTags();
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Speichern der Notiz', 'error');
    }
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

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, note: Note) => {
    setAnchorEl(event.currentTarget);
    setSelectedNote(note);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceBadgeColor = (sourceType?: string) => {
    switch (sourceType) {
      case 'chat': return 'primary';
      case 'faq': return 'secondary';
      case 'document': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Toolbar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Notizen durchsuchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Quelle</InputLabel>
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            label="Quelle"
          >
            <MenuItem value="all">Alle</MenuItem>
            <MenuItem value="chat">Chat</MenuItem>
            <MenuItem value="faq">FAQ</MenuItem>
            <MenuItem value="document">Dokument</MenuItem>
            <MenuItem value="manual">Manuell</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Filter Tags */}
      {selectedTags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>Aktive Filter:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Notes Grid */}
      {notes.length === 0 && !loading ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {searchQuery || selectedTags.length > 0 || sourceFilter !== 'all'
            ? 'Keine Notizen gefunden, die den Filterkriterien entsprechen.'
            : 'Sie haben noch keine Notizen. Erstellen Sie Ihre erste Notiz mit dem + Button.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {notes.map((note) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={note.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3" noWrap sx={{ flexGrow: 1 }}>
                      {note.title || 'Unbenannte Notiz'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, note)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 2,
                      minHeight: '3.6em'
                    }}
                  >
                    {note.content}
                  </Typography>

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      {note.tags.slice(0, 3).map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          onClick={() => {
                            if (!selectedTags.includes(tag)) {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                        />
                      ))}
                      {note.tags.length > 3 && (
                        <Chip
                          label={`+${note.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      )}
                    </Box>
                  )}

                  {/* Source info */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {note.source_type && (
                        <Chip
                          label={note.source_type}
                          size="small"
                          color={getSourceBadgeColor(note.source_type)}
                          icon={<LinkIcon />}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(note.updated_at)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="add note"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreateNote}
      >
        <AddIcon />
      </Fab>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedNote && handleEditNote(selectedNote)}>
          <EditIcon sx={{ mr: 1 }} /> Bearbeiten
        </MenuItem>
        <MenuItem 
          onClick={() => selectedNote && handleDeleteNote(selectedNote.id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Löschen
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingNote ? 'Notiz bearbeiten' : 'Neue Notiz erstellen'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Titel"
            fullWidth
            variant="outlined"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Inhalt"
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            sx={{ mb: 2 }}
          />

          {/* Tags */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {noteTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Neuen Tag hinzufügen"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag} variant="outlined" size="small">
                <TagIcon />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setIsNoteDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleSaveNote}
            variant="contained"
            disabled={!noteContent.trim()}
          >
            {editingNote ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotesManager;
