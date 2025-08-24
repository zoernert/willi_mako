import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Collapse,
  Divider,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Link as MuiLink,
  Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Computer as ComputerIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Report as ReportIcon,
  Description as DescriptionIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import codeLookupApi, { UnifiedCodeSearchResult as ApiCodeSearchResult, DetailedCodeResult as ApiDetailedCodeResult, SearchFilters as ApiSearchFilters, ContactEntry } from '../../services/codeLookupApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Local types compatible with API
interface SoftwareSystem {
  name: string;
  confidence: 'High' | 'Medium' | 'Low';
  evidence_text: string;
}

interface CodeSearchResult extends ApiCodeSearchResult {}
interface DetailedCodeResult extends ApiDetailedCodeResult {}
interface SearchFilters extends ApiSearchFilters {}

const CodeSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState<DetailedCodeResult | null>(null);
  
  // Error reporting states
  const [errorReportDialog, setErrorReportDialog] = useState(false);
  const [errorDescription, setErrorDescription] = useState('');
  const [reportingError, setReportingError] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [availableSoftwareSystems, setAvailableSoftwareSystems] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableCodeFunctions, setAvailableCodeFunctions] = useState<string[]>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [systemsRes, citiesRes, functionsRes] = await Promise.all([
          codeLookupApi.getAvailableSoftwareSystems(),
          codeLookupApi.getAvailableCities(),
          codeLookupApi.getAvailableCodeFunctions()
        ]);

        if (systemsRes?.softwareSystems) setAvailableSoftwareSystems(systemsRes.softwareSystems);
        if (citiesRes?.cities) setAvailableCities(citiesRes.cities);
        if (functionsRes?.functions) setAvailableCodeFunctions(functionsRes.functions);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };

    loadFilterOptions();
  }, []);

  const performSearch = useCallback(async (term: string, searchFilters: SearchFilters = {}) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await codeLookupApi.searchCodes(term, searchFilters);
      setResults(response.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Fehler beim Suchen');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback((term: string, searchFilters: SearchFilters) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => performSearch(term, searchFilters), 300);
  }, [performSearch]);

  // Trigger search on term or filter changes
  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm, filters);
    } else {
      setResults([]);
    }
  }, [searchTerm, filters, debouncedSearch]);

  const loadCodeDetails = async (result: CodeSearchResult) => {
    try {
      // Determine a primary code to fetch extra details if available
      const bdewCodes = getBdewCodesFromContacts(result);
      const primaryCode = result.code || bdewCodes[0];
      if (primaryCode) {
        const data = await codeLookupApi.getCodeDetails(primaryCode);
        if (data && data.result) {
          // Merge fetched data with existing card result, preserving contacts if missing
            const merged: DetailedCodeResult = {
              ...result,
              ...data.result,
              contacts: (data.result.contacts && data.result.contacts.length > 0)
                ? data.result.contacts
                : result.contacts,
              bdewCodes: (data.result.bdewCodes && data.result.bdewCodes.length > 0)
                ? data.result.bdewCodes
                : result.bdewCodes
            };
            setDetailDialog(merged);
            return;
        }
      }
      // Fallback: just show existing result without extra fetch data
      setDetailDialog(result as DetailedCodeResult);
    } catch (err) {
      console.error('Detail error:', err);
      // Still show what we have locally
      setDetailDialog(result as DetailedCodeResult);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'success';
      case 'Medium': return 'warning';
      case 'Low': return 'error';
      default: return 'default';
    }
  };

  const clearFilters = () => {
    setFilters({});
    setShowFilters(false);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  const formatPostalAddress = (c: ContactEntry) => {
    const lines: string[] = [];
    if (c.Street) lines.push(c.Street);
    const line2 = [c.PostCode, c.City].filter(Boolean).join(' ');
    if (line2) lines.push(line2);
    if (c.Country) lines.push(c.Country);
    return lines.join('\n');
  };

  // Extract BDEW codes from contacts array
  const getBdewCodesFromContacts = (result: CodeSearchResult): string[] => {
    if (result.bdewCodes && result.bdewCodes.length > 0) {
      return result.bdewCodes; // Fallback to legacy field
    }
    if (result.contacts && result.contacts.length > 0) {
      return result.contacts
        .map(c => c.BdewCode)
        .filter((code): code is string => Boolean(code));
    }
    return [];
  };

  // Handle error reporting
  const handleReportError = async () => {
    if (!detailDialog || !errorDescription.trim()) {
      return;
    }

    setReportingError(true);
    setReportErrorMessage(null);

    try {
      await codeLookupApi.reportError(detailDialog, errorDescription);
      setReportSuccess(true);
      setErrorReportDialog(false);
      setErrorDescription('');
      setTimeout(() => setReportSuccess(false), 5000); // Hide success message after 5 seconds
    } catch (err) {
      console.error('Error reporting failed:', err);
      setReportErrorMessage('Fehler beim Senden der Meldung. Bitte versuchen Sie es später erneut.');
    } finally {
      setReportingError(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 2 }}>
        Marktpartner Suche
      </Typography>

      {/* Search Box */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Code, Unternehmensname, Stadt oder PLZ suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: loading && <CircularProgress size={20} />
            }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              variant={hasActiveFilters ? 'contained' : 'outlined'}
              size="small"
            >
              Filter ({hasActiveFilters ? 'aktiv' : 'inaktiv'})
            </Button>
            
            {hasActiveFilters && (
              <Button
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
                color="secondary"
              >
                Filter zurücksetzen
              </Button>
            )}
          </Box>

          {/* Filter Panel */}
          <Collapse in={showFilters}>
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: 'repeat(12, 1fr)',
                    md: 'repeat(12, 1fr)'
                  }
                }}
              >
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <Autocomplete
                    multiple
                    options={availableSoftwareSystems}
                    value={filters.softwareSystems || []}
                    onChange={(_, value) => setFilters(prev => ({ ...prev, softwareSystems: value }))}
                    renderInput={(params) => (
                      <TextField {...params} label="Software-Systeme" size="small" />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option}
                          size="small"
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                  />
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <Autocomplete
                    options={availableCities}
                    value={filters.city || ''}
                    onChange={(_, value) => setFilters(prev => ({ ...prev, city: value || undefined }))}
                    renderInput={(params) => (
                      <TextField {...params} label="Stadt" size="small" />
                    )}
                  />
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                  <TextField
                    fullWidth
                    label="PLZ"
                    size="small"
                    value={filters.postCode || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, postCode: e.target.value || undefined }))}
                  />
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                  <Autocomplete
                    options={availableCodeFunctions}
                    value={filters.codeFunction || ''}
                    onChange={(_, value) => setFilters(prev => ({ ...prev, codeFunction: value || undefined }))}
                    renderInput={(params) => (
                      <TextField {...params} label="Code-Funktion" size="small" />
                    )}
                  />
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Vertrauensniveau</InputLabel>
                    <Select
                      multiple
                      value={filters.confidence || []}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        confidence: e.target.value as ('High' | 'Medium' | 'Low')[]
                      }))}
                      input={<OutlinedInput label="Vertrauensniveau" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="High">Hoch</MenuItem>
                      <MenuItem value="Medium">Mittel</MenuItem>
                      <MenuItem value="Low">Niedrig</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Results */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        {results.length > 0 ? `${results.length} Ergebnisse gefunden` : 
         searchTerm && !loading ? 'Keine Ergebnisse gefunden' : ''}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)'
          }
        }}
      >
        {results.map((result, idx) => {
          // Determine display fields for new structure
          const title = result.companyName || result.code || `Ergebnis ${idx + 1}`;
          const bdewCodesCount = getBdewCodesFromContacts(result).length;
          const subtitle = result.codeType || (bdewCodesCount > 0 ? `${bdewCodesCount} BDEW-Codes` : undefined);
          const city = result.city || result.contacts?.[0]?.City;
          const postCode = result.postCode || result.contacts?.[0]?.PostCode;
          const street = result.street || result.contacts?.[0]?.Street;
          const country = result.country || result.contacts?.[0]?.Country;

          return (
            <Box key={(result._id as any)?.$oid || (typeof result._id === 'string' ? result._id : undefined) || result.code || idx}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 }
                }}
                onClick={() => loadCodeDetails(result)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                      {title}
                    </Typography>
                    {/* Remove legacy source chip or keep if available */}
                    {result.source && (
                      <Chip 
                        label={result.source.toUpperCase()} 
                        size="small" 
                        color="primary" 
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>

                  {subtitle && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {subtitle}
                    </Typography>
                  )}

                  {result.contacts && result.contacts.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Table size="small" sx={{ '& td, & th': { borderBottom: '1px solid', borderColor: 'divider', py: 0.5 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ pl: 0, fontWeight: 'bold' }}>Marktrolle</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>BDEW-Code</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.contacts.map((c: ContactEntry, i: number) => (
                            <TableRow key={i}>
                              <TableCell sx={{ pl: 0 }}>{c.BdewCodeFunction || '—'}</TableCell>
                              <TableCell>{c.BdewCode || (c.CompanyUID || '—')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* Wenn EIC-Informationen vorhanden sind, anzeigen */}
                      {result.contacts.some(c => c.EIC_Code) && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          <strong>EIC-Info verfügbar</strong> (siehe Details)
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Location */}
                  {(city || street) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {street ? `${street}, ` : ''}{postCode ? `${postCode} ` : ''}{city}{country ? `, ${country}` : ''}
                      </Typography>
                    </Box>
                  )}

                  {/* Software systems (legacy + new) */}
                  {(result.softwareSystems && result.softwareSystems.length > 0) || (result.allSoftwareSystems && result.allSoftwareSystems.length > 0) ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                        Software-Systeme:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(result.softwareSystems || result.allSoftwareSystems || []).slice(0, 3).map((system: any, index: number) => (
                          <Chip
                            key={index}
                            label={system.name}
                            size="small"
                            color={getConfidenceColor(system.confidence) as any}
                            variant="outlined"
                          />
                        ))}
                        {((result.softwareSystems || result.allSoftwareSystems || []).length > 3) && (
                          <Chip label={`+${(result.softwareSystems || result.allSoftwareSystems || []).length - 3} weitere`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  ) : null}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => loadCodeDetails(result)}
                    >
                      Vollansicht
                    </Button>
                  </Box>
                  {/* Removed expandable inline details */}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {/* Detail Dialog */}
      <Dialog 
        open={!!detailDialog} 
        onClose={() => setDetailDialog(null)} 
        maxWidth="md" 
        fullWidth
      >
        {detailDialog && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6">{detailDialog.companyName || detailDialog.code}</Typography>
                {/* Show company UID instead of database ID */}
                {detailDialog.contacts?.[0]?.CompanyUID && (
                  <Typography variant="subtitle2" color="text.secondary">
                    Unternehmensnummer: {detailDialog.contacts[0].CompanyUID}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<ReportIcon />}
                  onClick={() => setErrorReportDialog(true)}
                >
                  Fehler melden
                </Button>
                <IconButton onClick={() => setDetailDialog(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: {
                    xs: 'repeat(12, 1fr)',
                    md: 'repeat(12, 1fr)'
                  }
                }}
              >
                <Box sx={{ gridColumn: 'span 12' }}>
                  <Typography variant="h6" gutterBottom>
                    Kontaktdaten
                  </Typography>
                  <Stack spacing={1}>
                    {detailDialog.contacts && detailDialog.contacts.length > 0 ? (
                      <List>
                        {detailDialog.contacts.map((c: ContactEntry, i: number) => (
                          <ListItem key={i} alignItems="flex-start" disableGutters sx={{ mb: 2 }}>
                            <ListItemText
                              primary={
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                  {c.BdewCodeFunction || 'Marktrolle'}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  {c.BdewCode && (
                                    <Typography variant="body2"><strong>BdewCode:</strong> {c.BdewCode}</Typography>
                                  )}
                                  <Typography variant="body2"><strong>Unternehmensnummer:</strong> {c.CompanyUID || '—'}</Typography>
                                  {c.BdewCodeStatus && (
                                    <Typography variant="body2"><strong>Status:</strong> {c.BdewCodeStatus}</Typography>
                                  )}
                                  {c.BdewCodeStatusBegin && (
                                    <Typography variant="body2"><strong>Status seit:</strong> {new Date(c.BdewCodeStatusBegin).toLocaleDateString('de-DE')}</Typography>
                                  )}
                                  
                                  {/* EIC-Informationen */}
                                  {c.EIC_Code && (
                                    <Typography variant="body2"><strong>EIC-Code:</strong> {c.EIC_Code}</Typography>
                                  )}
                                  {c.EIC_Typ && (
                                    <Typography variant="body2"><strong>EIC-Typ:</strong> {c.EIC_Typ}</Typography>
                                  )}
                                  {c.EIC_Function && (
                                    <Typography variant="body2"><strong>EIC-Funktion:</strong> {c.EIC_Function}</Typography>
                                  )}
                                  {c.EIC_Display_Name && (
                                    <Typography variant="body2"><strong>EIC-Name:</strong> {c.EIC_Display_Name}</Typography>
                                  )}
                                  {c.EIC_Long_Name && (
                                    <Typography variant="body2"><strong>EIC-Vollname:</strong> {c.EIC_Long_Name}</Typography>
                                  )}
                                  {c.Website && (
                                    <Typography variant="body2"><strong>Website:</strong> {c.Website}</Typography>
                                  )}
                                  {c.UstId && (
                                    <Typography variant="body2"><strong>USt-ID:</strong> {c.UstId}</Typography>
                                  )}
                                  
                                  <Divider sx={{ my: 1 }} />
                                  
                                  {c.CodeContact && (
                                    <Typography variant="body2"><strong>Ansprechpartner:</strong> {c.CodeContact}</Typography>
                                  )}
                                  {c.CodeContactPhone && (
                                    <Typography variant="body2"><strong>Telefon:</strong> {c.CodeContactPhone}</Typography>
                                  )}
                                  {c.CodeContactEmail && (
                                    <Typography variant="body2"><strong>E-Mail:</strong> {c.CodeContactEmail}</Typography>
                                  )}
                                  {(c.Street || c.PostCode || c.City || c.Country) && (
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                      <strong>Anschrift:</strong>
{formatPostalAddress(c)}
                                    </Typography>
                                  )}
                                  
                                  {/* Neue Felder: Kontaktdatenblatt-Link */}
                                  {c.contactSheetUrl && (
                                    <Box sx={{ mt: 1 }}>
                                      <MuiLink 
                                        href={c.contactSheetUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          textDecoration: 'none',
                                          color: 'primary.main' 
                                        }}
                                      >
                                        <FileDownloadIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                                        <Typography variant="body2">Kontaktdatenblatt herunterladen</Typography>
                                      </MuiLink>
                                    </Box>
                                  )}
                                  
                                  {/* Markdown Kontaktdatenblatt pro Kontakt */}
                                  {c.markdown && (
                                    <Box sx={{ mt: 2 }}>
                                      <Typography variant="body2"><strong>Kontaktdatenblatt:</strong></Typography>
                                      <Paper elevation={0} variant="outlined" sx={{ p: 1, mt: 1, maxHeight: '200px', overflow: 'auto' }}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.markdown}</ReactMarkdown>
                                      </Paper>
                                    </Box>
                                  )}
                                  
                                  {c.EditedOn && (
                                    <Typography variant="caption" color="text.secondary">Bearbeitet: {new Date(c.EditedOn).toLocaleDateString('de-DE')}</Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Keine Kontaktdaten verfügbar.</Typography>
                    )}
                  </Stack>
                </Box>

                {/* Markdown Kontaktdatenblatt */}
                {detailDialog.markdown && (
                  <Box sx={{ gridColumn: 'span 12', mt: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <DescriptionIcon sx={{ mr: 1 }} />
                      Kontaktdatenblatt
                    </Typography>
                    <Paper elevation={1} sx={{ p: 2, maxHeight: '400px', overflow: 'auto' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailDialog.markdown}</ReactMarkdown>
                    </Paper>
                  </Box>
                )}
                
                {/* Contact Sheet URL at Document level (outside of contacts) */}
                {detailDialog.contactSheetUrl && !detailDialog.contacts?.some(c => c.contactSheetUrl) && (
                  <Box sx={{ gridColumn: 'span 12', mt: 2 }}>
                    <MuiLink 
                      href={detailDialog.contactSheetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        textDecoration: 'none',
                        color: 'primary.main' 
                      }}
                    >
                      <FileDownloadIcon sx={{ mr: 0.5 }} />
                      <Typography>Kontaktdatenblatt herunterladen</Typography>
                    </MuiLink>
                  </Box>
                )}

                {(detailDialog.allSoftwareSystems && detailDialog.allSoftwareSystems.length > 0) && (
                  <Box sx={{ gridColumn: 'span 12' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <ComputerIcon sx={{ mr: 1 }} />
                      Software-Systeme
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {detailDialog.allSoftwareSystems.map((system, index) => (
                        <Chip
                          key={index}
                          label={`${system.name} (${system.confidence})`}
                          color={getConfidenceColor(system.confidence) as any}
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {detailDialog.findings && detailDialog.findings.length > 0 && (
                  <Box sx={{ gridColumn: 'span 12' }}>
                    <Typography variant="h6" gutterBottom>
                      Datenquellen
                    </Typography>
                    <List>
                      {detailDialog.findings.map((finding: any, index: number) => (
                        <ListItem key={index} divider>
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24, fontSize: '0.75rem' }}>
                              {index + 1}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              finding.source_url ? (
                                <MuiLink 
                                  href={finding.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  sx={{ textDecoration: 'none' }}
                                >
                                  {finding.source_url}
                                </MuiLink>
                              ) : (
                                <Typography variant="body2" color="text.secondary">Quelle unbekannt</Typography>
                              )
                            }
                            secondary={
                              <Box>
                                {finding.retrieved_at && (
                                  <Typography variant="body2" color="text.secondary">
                                    Abgerufen am: {new Date(finding.retrieved_at).toLocaleDateString('de-DE')}
                                  </Typography>
                                )}
                                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {(finding.software_systems || []).map((system: any, sysIndex: number) => (
                                    <Chip
                                      key={sysIndex}
                                      label={`${system.name} (${system.confidence})`}
                                      size="small"
                                      color={getConfidenceColor(system.confidence) as any}
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Downloads Section */}
                {detailDialog.contacts && detailDialog.contacts.some(c => c.downloads && c.downloads.length > 0) && (
                  <Box sx={{ gridColumn: 'span 12' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <FileDownloadIcon sx={{ mr: 1 }} />
                      Verfügbare Downloads
                    </Typography>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Dokument</TableCell>
                            <TableCell>Zuletzt geprüft</TableCell>
                            <TableCell>Download</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detailDialog.contacts
                            .filter(contact => contact.downloads && contact.downloads.length > 0)
                            .flatMap(contact => contact.downloads || [])
                            // Remove duplicate URLs
                            .filter((download, index, self) => 
                              index === self.findIndex(d => d.url === download.url)
                            )
                            .map((download, index) => (
                              <TableRow key={index} hover>
                                <TableCell>
                                  <Typography variant="body2">
                                    {download.text || 'Dokument'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {download.lastChecked 
                                      ? new Date(download.lastChecked).toLocaleDateString('de-DE') 
                                      : 'Unbekannt'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <MuiLink 
                                    href={download.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <Button 
                                      variant="outlined" 
                                      size="small" 
                                      startIcon={<FileDownloadIcon />}
                                    >
                                      PDF
                                    </Button>
                                  </MuiLink>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Box>
                )}

                {/* Contact Sheet URL */}
                {detailDialog.contacts && detailDialog.contacts.length > 0 && detailDialog.contacts[0].contactSheetUrl && (
                  <Box sx={{ gridColumn: 'span 12' }}>
                    <Typography variant="h6" gutterBottom>
                      Kontaktblatt
                    </Typography>
                    <MuiLink 
                      href={detailDialog.contacts[0].contactSheetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ display: 'inline-block', mb: 2 }}
                    >
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<FileDownloadIcon />}
                      >
                        Kontaktblatt herunterladen
                      </Button>
                    </MuiLink>
                  </Box>
                )}

                {/* Markdown Fields */}
                {detailDialog.contacts && detailDialog.contacts.length > 0 && detailDialog.contacts[0].markdown && (
                  <Box sx={{ gridColumn: 'span 12' }}>
                    <Typography variant="h6" gutterBottom>
                      Zusätzliche Informationen
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                      <ReactMarkdown>
                        {detailDialog.contacts[0].markdown}
                      </ReactMarkdown>
                    </Paper>
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Error Report Dialog */}
      <Dialog 
        open={errorReportDialog} 
        onClose={() => setErrorReportDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ReportIcon sx={{ mr: 1, color: 'warning.main' }} />
            Fehler melden
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Haben Sie einen Fehler in den Marktpartner-Daten gefunden? Helfen Sie uns dabei, die Datenqualität zu verbessern.
          </Typography>
          
          {detailDialog && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Betroffener Marktpartner:
              </Typography>
              <Typography variant="body2">
                <strong>{detailDialog.companyName || detailDialog.code}</strong>
                {detailDialog.contacts?.[0]?.CompanyUID && (
                  <> • Unternehmensnummer: {detailDialog.contacts[0].CompanyUID}</>
                )}
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Fehlerbeschreibung"
            placeholder="Beschreiben Sie bitte den gefundenen Fehler so detailliert wie möglich..."
            value={errorDescription}
            onChange={(e) => setErrorDescription(e.target.value)}
            error={!!reportErrorMessage}
            helperText={reportErrorMessage || 'Ihre Meldung wird an unser Team weitergeleitet und schnellstmöglich bearbeitet.'}
            sx={{ mb: 2 }}
          />
          
          {reportSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Ihr Fehlerbericht wurde erfolgreich gesendet. Vielen Dank für Ihre Meldung!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorReportDialog(false)} color="primary">
            Abbrechen
          </Button>
          <Button 
            onClick={handleReportError} 
            color="primary" 
            disabled={reportingError || !errorDescription.trim()}
          >
            {reportingError ? <CircularProgress size={24} /> : 'Fehler melden'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={reportSuccess}
        autoHideDuration={5000}
        onClose={() => setReportSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setReportSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Fehlermeldung erfolgreich gesendet! Vielen Dank für Ihr Feedback.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CodeSearch;
