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
  IconButton,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Link as MuiLink,
  Table, TableHead, TableRow, TableCell, TableBody
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
  Clear as ClearIcon
} from '@mui/icons-material';
import codeLookupApi, { UnifiedCodeSearchResult as ApiCodeSearchResult, DetailedCodeResult as ApiDetailedCodeResult, SearchFilters as ApiSearchFilters, ContactEntry } from '../../services/codeLookupApi';

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
                  '&:hover': { boxShadow: 4 }
                }}
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
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>Marktrollen / Codes:</Typography>
                      <Table size="small" sx={{ '& td, & th': { borderBottom: '1px solid', borderColor: 'divider', py: 0.5 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ pl: 0 }}>Marktrolle</TableCell>
                            <TableCell>BDEW-Code</TableCell>
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
                    </Box>
                  )}

                  {/* BDEW Codes preview - use new extraction function */}
                  {(() => {
                    const bdewCodes = getBdewCodesFromContacts(result);
                    return bdewCodes.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          BDEW-Codes:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {bdewCodes.slice(0, 3).map((code, i) => (
                            <Chip key={i} label={code} size="small" variant="outlined" />
                          ))}
                          {bdewCodes.length > 3 && (
                            <Chip label={`+${bdewCodes.length - 3} weitere`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                    );
                  })()}

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
                {detailDialog.companyName && detailDialog.code && (
                  <Typography variant="subtitle2" color="text.secondary">
                    Code: {detailDialog.code}
                  </Typography>
                )}
              </Box>
              <IconButton onClick={() => setDetailDialog(null)}>
                <CloseIcon />
              </IconButton>
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
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <Typography variant="h6" gutterBottom>
                    Unternehmensdaten
                  </Typography>
                  <Stack spacing={1}>
                    {detailDialog.companyName && (
                      <Typography><strong>Name:</strong> {detailDialog.companyName}</Typography>
                    )}
                    {(() => {
                      const bdewCodes = getBdewCodesFromContacts(detailDialog);
                      return bdewCodes.length > 0 && (
                        <Typography><strong>BDEW-Codes:</strong> {bdewCodes.join(', ')}</Typography>
                      );
                    })()}
                    {detailDialog.street && (
                      <Typography><strong>Adresse:</strong> {detailDialog.street}</Typography>
                    )}
                    {(detailDialog.city || detailDialog.postCode) && (
                      <Typography><strong>Ort:</strong> {detailDialog.postCode} {detailDialog.city}</Typography>
                    )}
                    {detailDialog.country && (
                      <Typography><strong>Land:</strong> {detailDialog.country}</Typography>
                    )}
                  </Stack>
                </Box>
                
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <Typography variant="h6" gutterBottom>
                    Kontaktdaten
                  </Typography>
                  <Stack spacing={1}>
                    {detailDialog.contacts && detailDialog.contacts.length > 0 ? (
                      <List>
                        {detailDialog.contacts.map((c: ContactEntry, i: number) => (
                          <ListItem key={i} alignItems="flex-start" disableGutters sx={{ mb: 1 }}>
                            <ListItemText
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="body2"><strong>Marktrolle:</strong> {c.BdewCodeFunction || '—'}</Typography>
                                  <Typography variant="body2"><strong>Unternehmensnummer:</strong> {c.CompanyUID || '—'}</Typography>
                                  {c.BdewCodeType && (
                                    <Typography variant="body2"><strong>Code-Typ:</strong> {c.BdewCodeType}</Typography>
                                  )}
                                  {c.BdewCodeStatus && (
                                    <Typography variant="body2"><strong>Status:</strong> {c.BdewCodeStatus}</Typography>
                                  )}
                                  {c.BdewCodeStatusBegin && (
                                    <Typography variant="body2"><strong>Status seit:</strong> {new Date(c.BdewCodeStatusBegin).toLocaleDateString('de-DE')}</Typography>
                                  )}
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
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CodeSearch;
