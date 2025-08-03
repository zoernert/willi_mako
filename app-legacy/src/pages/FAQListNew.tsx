import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Pagination,
  Stack,
  Autocomplete,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Chat as ChatIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { FAQWithLinks } from '../types/faq';
import apiClient from '../services/apiClient';

interface FAQ {
  id: string;
  title: string;
  description: string;
  context: string;
  answer: string;
  additional_info: string;
  view_count: number;
  created_at: string;
  tags: string[];
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const FAQList: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  
  const navigate = useNavigate();
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [searchTerm, selectedTag, sortBy, sortOrder, currentPage]);

  const fetchAvailableTags = async () => {
    try {
      const response = await apiClient.get('/faq-tags') as any;
      setAvailableTags(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchFAQs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((currentPage - 1) * pagination.limit).toString(),
        sort: sortBy,
        order: sortOrder,
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (selectedTag) {
        params.append('tag', selectedTag);
      }
      
      const response = await apiClient.get(`/faqs?${params.toString()}`) as any;
      
      if (response && response.data) {
        setFaqs(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setFaqs([]);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setError('Fehler beim Laden der FAQs');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedTag, sortBy, sortOrder, currentPage, pagination.limit]);

  const handleStartChatFromFAQ = async (faqId: string) => {
    if (!state.user) {
      navigate('/login');
      return;
    }

    try {
      const response = await apiClient.post(`/faqs/${faqId}/start-chat`) as any;
      navigate(`/chat/${response.chat.id}`);
    } catch (error) {
      console.error('Error starting chat from FAQ:', error);
      showSnackbar('Fehler beim Starten des Chats', 'error');
    }
  };

  const handleFAQClick = (faqId: string) => {
    navigate(`/faqs/${faqId}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && faqs.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#2c5530' }}>
            Häufig gestellte Fragen
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Durchsuchen Sie unsere umfangreiche FAQ-Sammlung oder starten Sie einen Chat zu einem spezifischen Thema
          </Typography>
        </Box>

        {/* Search and Filter Controls */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Search Bar */}
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Nach FAQs suchen..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleSearchChange('')} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Filter and Sort Controls */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              {/* Tag Filter */}
              <Autocomplete
                options={['', ...availableTags]}
                value={selectedTag}
                onChange={(_, value) => handleTagChange(value || '')}
                getOptionLabel={(option) => option === '' ? 'Alle Tags' : option}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tag filtern"
                    sx={{ minWidth: 200 }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                sx={{ flex: 1 }}
              />
              
              {/* Sort Controls */}
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Sortieren nach</InputLabel>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  label="Sortieren nach"
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                    setCurrentPage(1);
                  }}
                  startAdornment={<SortIcon sx={{ mr: 1 }} />}
                >
                  <MenuItem value="created_at-desc">Neueste zuerst</MenuItem>
                  <MenuItem value="created_at-asc">Älteste zuerst</MenuItem>
                  <MenuItem value="view_count-desc">Meist aufgerufen</MenuItem>
                  <MenuItem value="title-asc">Titel A-Z</MenuItem>
                  <MenuItem value="title-desc">Titel Z-A</MenuItem>
                </Select>
              </FormControl>
              
              {/* Clear Filters */}
              {(searchTerm || selectedTag) && (
                <Tooltip title="Filter zurücksetzen">
                  <IconButton onClick={clearFilters} color="primary">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            
            {/* Results Summary */}
            {!loading && (
              <Typography variant="body2" color="text.secondary">
                {pagination.total} FAQ{pagination.total !== 1 ? 's' : ''} gefunden
                {searchTerm && ` für "${searchTerm}"`}
                {selectedTag && ` mit Tag "${selectedTag}"`}
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* FAQ List */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : faqs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Keine FAQs gefunden
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm || selectedTag 
                ? 'Versuchen Sie andere Suchbegriffe oder Filter'
                : 'Derzeit sind keine FAQs verfügbar'
              }
            </Typography>
            {(searchTerm || selectedTag) && (
              <Button onClick={clearFilters} sx={{ mt: 2 }}>
                Filter zurücksetzen
              </Button>
            )}
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {faqs.map((faq) => (
              <Card 
                key={faq.id}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => handleFAQClick(faq.id)}
              >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flex: 1, mr: 2 }}>
                        {faq.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {faq.view_count} Aufrufe
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {truncateText(faq.description)}
                    </Typography>
                    
                    {/* Tags */}
                    {faq.tags && faq.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                        {faq.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTagChange(tag);
                            }}
                            sx={{ 
                              backgroundColor: selectedTag === tag ? '#147a50' : 'rgba(20, 122, 80, 0.1)',
                              color: selectedTag === tag ? 'white' : '#147a50',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: '#147a50',
                                color: 'white',
                              }
                            }}
                          />
                        ))}
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                      <Typography variant="caption" color="text.secondary">
                        Erstellt am {formatDate(faq.created_at)}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFAQClick(faq.id);
                          }}
                        >
                          Details
                        </Button>
                        {state.user && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<ChatIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartChatFromFAQ(faq.id);
                            }}
                            sx={{ 
                              backgroundColor: '#147a50', 
                              '&:hover': { backgroundColor: '#0d5538' } 
                            }}
                          >
                            Chat
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default FAQList;
