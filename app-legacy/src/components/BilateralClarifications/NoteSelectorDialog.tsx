// Notes-Selector für Bilaterale Klärfälle
// Erstellt: 20. August 2025
// Beschreibung: Dialog zum Auswählen von bestehenden Notizen als Kontext für Klärfälle

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  TextField,
  CircularProgress,
  Chip,
  IconButton,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  Note as NoteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Label as LabelIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  sourceType?: string;
  sourceId?: string;
}

interface NoteSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (noteId: string, noteTitle: string) => Promise<void>;
  clarificationId: string;
}

export const NoteSelectorDialog: React.FC<NoteSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  clarificationId
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [addingNote, setAddingNote] = useState(false);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch notes from API
      console.log('Versuche Notizen zu laden...');
      const response = await fetch('/api/notes?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        console.error('API-Fehler:', response.status, response.statusText);
        throw new Error(`Fehler beim Laden der Notizen: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Geladene Notizen (Datentyp):', typeof data, Array.isArray(data));
      console.log('Geladene Notizen (Struktur):', Object.keys(data));
      
      // Prüfen, ob die Datenstruktur wie erwartet ist
      if (data && Array.isArray(data.notes)) {
        console.log(`${data.notes.length} Notizen geladen`);
        setNotes(data.notes);
      } else if (data && Array.isArray(data)) {
        console.log(`${data.length} Notizen geladen (direktes Array)`);
        setNotes(data);
      } else {
        console.error('Unerwartetes Datenformat:', data);
        throw new Error('Unerwartetes Datenformat von der API erhalten');
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Fehler beim Laden der Notizen. Testdaten werden verwendet.');
      // Testdaten laden, wenn die API nicht erreichbar ist
      loadTestData();
    } finally {
      setLoading(false);
    }
  };

  // Test-Modus: Fake-Daten laden, wenn die API nicht erreichbar ist
  const loadTestData = () => {
    console.log('Lade Test-Notizen');
    try {
      const currentDate = new Date().toISOString();
      const testNotes: Note[] = [
        {
          id: '1',
          title: 'Test Notiz 1',
          content: 'Dies ist eine Testnotiz mit einigen wichtigen Informationen.',
          createdAt: currentDate,
          updatedAt: currentDate,
          tags: ['test', 'wichtig'],
        },
        {
          id: '2',
          title: 'Besprechungsnotiz',
          content: 'Besprechung mit Marktpartner XYZ am 19.08.2025. Wichtige Punkte: ...',
          createdAt: currentDate,
          updatedAt: currentDate,
          tags: ['besprechung', 'marktpartner'],
        },
        {
          id: '3',
          title: 'Problemfall dokumentieren',
          content: 'Folgende Probleme wurden bei der EDIFACT-Nachricht festgestellt...',
          createdAt: currentDate,
          updatedAt: currentDate,
          tags: ['edifact', 'problem', 'dokumentation'],
        }
      ];
      setNotes(testNotes);
    } catch (err) {
      console.error('Fehler beim Erstellen der Testdaten:', err);
      // Fallback mit minimalen Daten
      setNotes([{
        id: '1',
        title: 'Notfall-Testnotiz',
        content: 'Testinhalt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['test']
      }]);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotes();
    } else {
      setSelectedNote(null);
      setSearchQuery('');
    }
  }, [open]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
  };

  const handleAddNote = async () => {
    if (!selectedNote) return;
    
    setAddingNote(true);
    try {
      console.log('Füge Notiz hinzu:', selectedNote.id, selectedNote.title);
      console.log('Clarification ID:', clarificationId);
      
      // Validierung
      if (!clarificationId) {
        throw new Error('Keine Klärfall-ID vorhanden');
      }
      if (!selectedNote.id) {
        throw new Error('Keine Notiz-ID vorhanden');
      }
      
      await onSelect(selectedNote.id, selectedNote.title);
      onClose();
    } catch (err) {
      console.error('Error adding note:', err);
      setError(`Fehler beim Hinzufügen der Notiz: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Prüfen, ob das Datum gültig ist
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Ungültiges Datum:', dateString);
        return 'Ungültiges Datum';
      }
      
      // Robustere Formatierung mit nativem JavaScript
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Fehler beim Formatieren des Datums:', err);
      return 'Datum unbekannt';
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          <NoteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Notiz als Kontext hinzufügen
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Suchen..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" height="calc(100% - 80px)">
            <Box sx={{ width: '50%', borderRight: '1px solid', borderColor: 'divider', pr: 2, overflow: 'auto' }}>
              {filteredNotes.length === 0 ? (
                <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Keine Notizen gefunden
                </Typography>
              ) : (
                <List sx={{ width: '100%' }}>
                  {filteredNotes.map((note) => (
                    <React.Fragment key={note.id}>
                      <ListItem 
                        disablePadding
                      >
                        <ListItemButton
                          sx={{ 
                            borderRadius: 1,
                            bgcolor: selectedNote?.id === note.id ? 'action.selected' : 'transparent',
                          }}
                          onClick={() => handleSelectNote(note)}
                        >
                          <ListItemAvatar>
                            <Avatar>
                              <NoteIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={note.title || 'Unbenannte Notiz'}
                            secondary={`Zuletzt aktualisiert: ${formatDate(note.updatedAt)}`}
                            primaryTypographyProps={{
                              noWrap: true,
                              style: { fontWeight: selectedNote?.id === note.id ? 'bold' : 'normal' }
                            }}
                          />
                          {selectedNote?.id === note.id && (
                            <CheckIcon color="success" />
                          )}
                        </ListItemButton>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
            <Box sx={{ width: '50%', pl: 2, overflow: 'auto' }}>
              {selectedNote ? (
                <Card>
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6">{selectedNote.title || 'Unbenannte Notiz'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Notiz ID: {selectedNote.id}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Erstellt am</Typography>
                      <Typography variant="body1">{formatDate(selectedNote.createdAt)}</Typography>
                    </Box>
                    {selectedNote.tags && selectedNote.tags.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Tags</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {selectedNote.tags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              icon={<LabelIcon fontSize="small" />}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Inhalt</Typography>
                      <Typography variant="body1" sx={{ 
                        mt: 1,
                        p: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {selectedNote.content}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary">
                    Wählen Sie eine Notiz aus, um Details anzuzeigen
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={addingNote}>
          Abbrechen
        </Button>
        <Button 
          onClick={handleAddNote} 
          variant="contained" 
          disabled={!selectedNote || addingNote}
          startIcon={addingNote ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {addingNote ? 'Wird hinzugefügt...' : 'Hinzufügen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NoteSelectorDialog;
