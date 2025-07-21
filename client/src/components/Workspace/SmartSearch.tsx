import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Note as NoteIcon,
  Chat as ChatIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface SearchResult {
  id: string;
  type: 'note' | 'document';
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  relevance_score?: number;
}

interface SmartSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  onStartChat?: (query: string, context: SearchResult[]) => void;
  placeholder?: string;
  showChatAction?: boolean;
}

const SmartSearch: React.FC<SmartSearchProps> = ({
  onResultSelect,
  onStartChat,
  placeholder = "Durchsuchen Sie Ihre Notizen und Dokumente...",
  showChatAction = true
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedResults, setSelectedResults] = useState<SearchResult[]>([]);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  const { showSnackbar } = useSnackbar();

  const searchWorkspace = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workspace/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSuggestions(data.suggestions || []);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Error searching workspace:', error);
      showSnackbar('Fehler bei der Suche', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    
    if (value.length >= 2) {
      searchWorkspace(value);
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResults(prev => {
      const isSelected = prev.some(r => r.id === result.id && r.type === result.type);
      if (isSelected) {
        return prev.filter(r => !(r.id === result.id && r.type === result.type));
      } else {
        return [...prev, result];
      }
    });

    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  const handleStartChat = () => {
    if (selectedResults.length === 0) {
      showSnackbar('Bitte wählen Sie mindestens ein Ergebnis aus', 'warning');
      return;
    }
    setChatDialogOpen(true);
  };

  const handleConfirmChat = () => {
    if (onStartChat) {
      onStartChat(query, selectedResults);
    }
    setChatDialogOpen(false);
    setSelectedResults([]);
    setQuery('');
    setOpen(false);
  };

  const getResultIcon = (type: 'note' | 'document') => {
    return type === 'note' ? <NoteIcon /> : <DocumentIcon />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        variant="outlined"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: query && (
            <InputAdornment position="end">
              <IconButton onClick={() => {
                setQuery('');
                setResults([]);
                setOpen(false);
                setSelectedResults([]);
              }}>
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      {/* Search Results Dropdown */}
      {open && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: 400,
            overflow: 'auto',
            mt: 1
          }}
        >
          {loading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2">Suche läuft...</Typography>
            </Box>
          ) : results.length > 0 ? (
            <>
              <List>
                {results.map((result) => {
                  const isSelected = selectedResults.some(r => r.id === result.id && r.type === result.type);
                  return (
                    <ListItem
                      key={`${result.type}-${result.id}`}
                      component="button"
                      onClick={() => handleResultClick(result)}
                      sx={{
                        backgroundColor: isSelected ? 'primary.light' : 'inherit',
                        '&:hover': {
                          backgroundColor: isSelected ? 'primary.main' : 'action.hover'
                        },
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%'
                      }}
                    >
                      <ListItemIcon>
                        {getResultIcon(result.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {result.title}
                            </Typography>
                            <Chip
                              label={result.type === 'note' ? 'Notiz' : 'Dokument'}
                              size="small"
                              color={result.type === 'note' ? 'secondary' : 'primary'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {result.content.slice(0, 100)}...
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                              {result.tags.slice(0, 3).map((tag) => (
                                <Chip key={tag} label={tag} size="small" variant="outlined" />
                              ))}
                              <Typography variant="caption" sx={{ ml: 'auto' }}>
                                {formatDate(result.created_at)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
              
              {showChatAction && selectedResults.length > 0 && (
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ChatIcon />}
                    onClick={handleStartChat}
                    fullWidth
                  >
                    Chat mit {selectedResults.length} ausgewählten Element{selectedResults.length !== 1 ? 'en' : ''} starten
                  </Button>
                </Box>
              )}
            </>
          ) : query.length >= 2 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Keine Ergebnisse für "{query}" gefunden
              </Typography>
              {suggestions.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Vorschläge:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {suggestions.map((suggestion) => (
                      <Chip
                        key={suggestion}
                        label={suggestion}
                        size="small"
                        onClick={() => {
                          setQuery(suggestion);
                          searchWorkspace(suggestion);
                        }}
                        clickable
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : null}
        </Paper>
      )}

      {/* Chat Confirmation Dialog */}
      <Dialog open={chatDialogOpen} onClose={() => setChatDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chat mit Workspace-Kontext starten</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Möchten Sie einen Chat mit den folgenden ausgewählten Elementen als Kontext starten?
          </Typography>
          <List sx={{ mt: 2 }}>
            {selectedResults.map((result) => (
              <ListItem key={`${result.type}-${result.id}`}>
                <ListItemIcon>
                  {getResultIcon(result.type)}
                </ListItemIcon>
                <ListItemText
                  primary={result.title}
                  secondary={`${result.type === 'note' ? 'Notiz' : 'Dokument'} • ${formatDate(result.created_at)}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleConfirmChat} variant="contained" startIcon={<ChatIcon />}>
            Chat starten
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SmartSearch;
