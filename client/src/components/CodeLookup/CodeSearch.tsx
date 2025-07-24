import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Business as BusinessIcon,
  ElectricBolt as ElectricBoltIcon
} from '@mui/icons-material';
import codeLookupApi, { CodeSearchResult } from '../../services/codeLookupApi';

interface CodeSearchProps {
  onCodeSelect?: (code: CodeSearchResult) => void;
  initialQuery?: string;
  compact?: boolean;
}

const CodeSearch: React.FC<CodeSearchProps> = ({
  onCodeSelect,
  initialQuery = '',
  compact = false
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'all' | 'bdew' | 'eic'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search function
  const performSearch = useCallback(async (searchQuery: string, mode: 'all' | 'bdew' | 'eic') => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      switch (mode) {
        case 'bdew':
          response = await codeLookupApi.searchBDEWCodes(searchQuery);
          break;
        case 'eic':
          response = await codeLookupApi.searchEICCodes(searchQuery);
          break;
        default:
          response = await codeLookupApi.searchCodes(searchQuery);
      }
      
      setResults(response.results);
      setPage(0); // Reset pagination when new search
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Suchen');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    (searchQuery: string, mode: 'all' | 'bdew' | 'eic') => {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery, mode);
      }, 300);
    },
    [performSearch]
  );

  // Handle query change
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery, searchMode);
  };

  // Handle search mode change
  const handleSearchModeChange = (_event: React.SyntheticEvent, newValue: 'all' | 'bdew' | 'eic') => {
    setSearchMode(newValue);
    if (query.trim()) {
      debouncedSearch(query, newValue);
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError(null);
  };

  // Handle row click
  const handleRowClick = (code: CodeSearchResult) => {
    if (onCodeSelect) {
      onCodeSelect(code);
    }
  };

  // Pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Paginated results
  const paginatedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    const startIndex = page * rowsPerPage;
    return results.slice(startIndex, startIndex + rowsPerPage);
  }, [results, page, rowsPerPage]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
  };

  return (
    <Box>
      {/* Search Header */}
      <Box sx={{ mb: 3 }}>
        {/* Search Tabs */}
        <Tabs value={searchMode} onChange={handleSearchModeChange} sx={{ mb: 2 }}>
          <Tab label="Alle Codes" value="all" />
          <Tab label="BDEW-Codes" value="bdew" />
          <Tab label="EIC-Codes" value="eic" />
        </Tabs>

        {/* Search Input */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Code oder Unternehmen suchen..."
          value={query}
          onChange={handleQueryChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton onClick={handleClear} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Results */}
      {(results?.length || 0) > 0 && (
        <Paper>
          <TableContainer>
            <Table size={compact ? 'small' : 'medium'}>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Unternehmen</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell>Quelle</TableCell>
                  {!compact && <TableCell>Gültig von</TableCell>}
                  {!compact && <TableCell>Gültig bis</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedResults.map((result, index) => (
                  <TableRow
                    key={`${result.code}-${index}`}
                    hover
                    onClick={() => handleRowClick(result)}
                    sx={{ 
                      cursor: onCodeSelect ? 'pointer' : 'default',
                      '&:hover': onCodeSelect ? { backgroundColor: 'action.hover' } : {}
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {result.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2">
                          {result.companyName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {result.codeType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={result.source.toUpperCase()}
                        size="small"
                        color={result.source === 'bdew' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </TableCell>
                    {!compact && (
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(result.validFrom)}
                        </Typography>
                      </TableCell>
                    )}
                    {!compact && (
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(result.validTo)}
                        </Typography>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <TablePagination
            component="div"
            count={results?.length || 0}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Zeilen pro Seite:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
          />
        </Paper>
      )}

      {/* No results */}
      {!loading && query && (results?.length || 0) === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Keine Codes gefunden für "{query}"
          </Typography>
        </Box>
      )}

      {/* Initial state */}
      {!query && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Geben Sie einen Code oder Unternehmensnamen ein, um zu suchen
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CodeSearch;
