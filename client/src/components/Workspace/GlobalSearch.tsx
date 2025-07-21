import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Description as DocumentIcon,
  Notes as NotesIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface SearchResult {
  id: string;
  type: 'document' | 'note';
  title: string;
  snippet: string;
  highlights: string[];
  score: number;
  metadata?: {
    created_at: string;
    tags?: string[];
    file_size?: number;
    mime_type?: string;
  };
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  onResultSelect: (result: SearchResult) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  open,
  onClose,
  onResultSelect
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'all' | 'documents' | 'notes'>('all');
  
  const { showSnackbar } = useSnackbar();

  // Debounced search
  const debounceSearch = useCallback(
    debounce((searchQuery: string) => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setResults([]);
      }
    }, 300),
    [searchType]
  );

  useEffect(() => {
    if (query.trim().length >= 2) {
      debounceSearch(query);
    } else {
      setResults([]);
    }
  }, [query, debounceSearch]);

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        limit: '20'
      });

      const response = await fetch(`/api/workspace/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Suche fehlgeschlagen');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      showSnackbar('Fehler bei der Suche', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  };

  const getResultIcon = (type: string) => {
    return type === 'document' ? <DocumentIcon /> : <NotesIcon />;
  };

  const getResultTypeLabel = (type: string) => {
    return type === 'document' ? 'Dokument' : 'Notiz';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Globale Suche
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {/* Search Input */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder="Suchen Sie in Ihren Notizen und Dokumenten..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: loading && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              )
            }}
          />
          
          {/* Filter Chips */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Chip
              label="Alle"
              onClick={() => setSearchType('all')}
              color={searchType === 'all' ? 'primary' : 'default'}
              variant={searchType === 'all' ? 'filled' : 'outlined'}
              size="small"
            />
            <Chip
              label="Dokumente"
              onClick={() => setSearchType('documents')}
              color={searchType === 'documents' ? 'primary' : 'default'}
              variant={searchType === 'documents' ? 'filled' : 'outlined'}
              size="small"
              icon={<DocumentIcon />}
            />
            <Chip
              label="Notizen"
              onClick={() => setSearchType('notes')}
              color={searchType === 'notes' ? 'primary' : 'default'}
              variant={searchType === 'notes' ? 'filled' : 'outlined'}
              size="small"
              icon={<NotesIcon />}
            />
          </Box>
        </Box>

        {/* Search Results */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}
          
          {query.trim().length < 2 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Geben Sie mindestens 2 Zeichen ein, um zu suchen
              </Typography>
            </Box>
          )}
          
          {query.trim().length >= 2 && results.length === 0 && !loading && !error && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Keine Ergebnisse für "{query}" gefunden
              </Typography>
            </Box>
          )}
          
          {results.length > 0 && (
            <List sx={{ p: 0 }}>
              {results.map((result, index) => (
                <React.Fragment key={result.id}>
                  <ListItem
                    component="div"
                    onClick={() => handleResultClick(result)}
                    sx={{ 
                      py: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemIcon>
                      {getResultIcon(result.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" component="span">
                            {result.title}
                          </Typography>
                          <Chip 
                            label={getResultTypeLabel(result.type)}
                            size="small"
                            color={result.type === 'document' ? 'primary' : 'secondary'}
                          />
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ ml: 'auto' }}
                          >
                            Relevanz: {Math.round(result.score * 100)}%
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(result.snippet, result.highlights)
                            }}
                            sx={{ mb: 1 }}
                          />
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {result.metadata?.created_at && (
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(result.metadata.created_at)}
                              </Typography>
                            )}
                            
                            {result.metadata?.file_size && (
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(result.metadata.file_size)}
                              </Typography>
                            )}
                            
                            {result.metadata?.tags && result.metadata.tags.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {result.metadata.tags.slice(0, 3).map(tag => (
                                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                                ))}
                                {result.metadata.tags.length > 3 && (
                                  <Chip 
                                    label={`+${result.metadata.tags.length - 3}`} 
                                    size="small" 
                                    variant="outlined" 
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < results.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

export default GlobalSearch;
