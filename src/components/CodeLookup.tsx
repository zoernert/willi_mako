import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
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
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Computer as ComputerIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  Tag as TagIcon
} from '@mui/icons-material';

// Types compatible with the backend structure
interface ContactEntry {
  BdewCodeType?: string;
  BdewCodeFunction?: string;
  BdewCodeStatus?: string;
  BdewCodeStatusBegin?: string;
  CompanyUID?: string;
  PostCode?: string;
  City?: string;
  Street?: string;
  Country?: string;
  CodeContact?: string;
  CodeContactPhone?: string;
  CodeContactEmail?: string;
  EditedOn?: string;
}

interface SoftwareSystem {
  name: string;
  confidence: 'High' | 'Medium' | 'Low';
  evidence_text: string;
}

interface CodeSearchResult {
  _id?: { $oid: string } | string;
  companyName?: string;
  bdewCodes?: string[];
  contacts?: ContactEntry[];
  findings?: Array<{
    software_systems?: SoftwareSystem[];
    source_url?: string;
    retrieved_at?: Date | string;
  }>;
  processed_at?: { $date: string } | string;
  allSoftwareSystems?: SoftwareSystem[];

  // Legacy optional fields
  code?: string;
  companyUID?: string;
  codeType?: string;
  validFrom?: string;
  validTo?: string;
  source?: 'bdew' | 'eic';
  postCode?: string;
  city?: string;
  street?: string;
  country?: string;
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  softwareSystems?: SoftwareSystem[];
  editedOn?: string;
}

interface DetailedCodeResult extends CodeSearchResult {}

interface SearchFilters {
  softwareSystems?: string[];
  postCode?: string;
  city?: string;
  codeFunction?: string;
  confidence?: ('High' | 'Medium' | 'Low')[];
}

const CodeLookupComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const [softwareSystemsResponse, citiesResponse, functionsResponse] = await Promise.all([
          fetch('/api/v1/codes/software-systems'),
          fetch('/api/v1/codes/cities'),
          fetch('/api/v1/codes/functions')
        ]);

        const [softwareSystems, cities, functions] = await Promise.all([
          softwareSystemsResponse.json(),
          citiesResponse.json(),
          functionsResponse.json()
        ]);

        if (softwareSystems.success) {
          setAvailableSoftwareSystems(softwareSystems.data.softwareSystems);
        }
        if (cities.success) {
          setAvailableCities(cities.data.cities);
        }
        if (functions.success) {
          setAvailableCodeFunctions(functions.data.functions);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  const searchCodes = useCallback(async (term: string, searchFilters: SearchFilters = {}) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: term });
      
      // Add filters to params
      if (searchFilters.softwareSystems?.length) {
        searchFilters.softwareSystems.forEach(system => 
          params.append('softwareSystems', system)
        );
      }
      if (searchFilters.postCode) {
        params.append('postCode', searchFilters.postCode);
      }
      if (searchFilters.city) {
        params.append('city', searchFilters.city);
      }
      if (searchFilters.codeFunction) {
        params.append('codeFunction', searchFilters.codeFunction);
      }
      if (searchFilters.confidence?.length) {
        searchFilters.confidence.forEach(conf => 
          params.append('confidence', conf)
        );
      }

      const response = await fetch(`/api/v1/codes/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data.results);
      } else {
        setError('Fehler beim Suchen der Codes');
      }
    } catch (error) {
      setError('Netzwerkfehler beim Suchen');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback((term: string, searchFilters: SearchFilters) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchCodes(term, searchFilters), 300);
  }, [searchCodes]);

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm, filters);
    } else {
      setResults([]);
    }
  }, [searchTerm, filters, debouncedSearch]);

  const loadCodeDetails = async (code: string) => {
    try {
      const response = await fetch(`/api/v1/codes/details/${encodeURIComponent(code)}`);
      const data = await response.json();

      if (data.success && data.data.result) {
        setDetailDialog(data.data.result);
      } else {
        setError('Code-Details nicht gefunden');
      }
    } catch (error) {
      setError('Fehler beim Laden der Code-Details');
      console.error('Detail error:', error);
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

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Marktpartner Suche
      </Typography>

      {/* Search Box */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Unternehmen, Marktrolle, Code, Stadt oder PLZ suchen..."
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
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider', display: showFilters ? 'block' : 'none' }}>
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
                    <TextField {...params} label="Marktrolle" size="small" />
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
        {results.length > 0 ? `${results.length} Marktpartner gefunden` : 
         searchTerm && !loading ? 'Keine Marktpartner gefunden' : ''}
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
          const title = result.companyName || result.code || `Ergebnis ${idx + 1}`;
          const city = result.city || result.contacts?.[0]?.City;
          const postCode = result.postCode || result.contacts?.[0]?.PostCode;
          const street = result.street || result.contacts?.[0]?.Street;
          const country = result.country || result.contacts?.[0]?.Country;

          const roles = Array.from(new Set((result.contacts || []).map(c => c.BdewCodeFunction).filter(Boolean))) as string[];

          return (
            <Box key={(result._id as any)?.$oid || (typeof result._id === 'string' ? result._id : undefined) || result.code || idx}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flexGrow: 1 }}>
                      {title}
                    </Typography>
                    {result.source && <Chip label={result.source.toUpperCase()} size="small" color="primary" />}
                  </Box>

                  {!!roles.length && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>Marktrolle:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {roles.map((r, i) => <Chip key={i} label={r} size="small" variant="outlined" />)}
                      </Box>
                    </Box>
                  )}

                  {result.bdewCodes && result.bdewCodes.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>BDEW-Codes:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {result.bdewCodes.slice(0, 4).map((code, i) => <Chip key={i} label={code} size="small" variant="outlined" />)}
                        {result.bdewCodes.length > 4 && <Chip label={`+${result.bdewCodes.length - 4}`} size="small" variant="outlined" />}
                      </Box>
                    </Box>
                  )}

                  {(city || street) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {street ? `${street}, ` : ''}{postCode ? `${postCode} ` : ''}{city}{country ? `, ${country}` : ''}
                      </Typography>
                    </Box>
                  )}

                  {(result.softwareSystems && result.softwareSystems.length > 0) || (result.allSoftwareSystems && result.allSoftwareSystems.length > 0) ? (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>Software-Systeme:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(result.softwareSystems || result.allSoftwareSystems || []).slice(0, 3).map((system: any, index: number) => (
                          <Chip key={index} label={system.name} size="small" color={getConfidenceColor(system.confidence) as any} variant="outlined" />
                        ))}
                        {((result.softwareSystems || result.allSoftwareSystems || []).length > 3) && (
                          <Chip label={`+${(result.softwareSystems || result.allSoftwareSystems || []).length - 3}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  ) : null}

                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => loadCodeDetails(result.code || (result.bdewCodes?.[0] || ''))}>Vollansicht</Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="lg" fullWidth>
        {detailDialog && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
              <Box>
                <Typography variant="h6">{detailDialog.companyName || detailDialog.code}</Typography>
                <Typography variant="caption" color="text.secondary">ID: {(detailDialog._id as any)?.$oid || (typeof detailDialog._id === 'string' ? detailDialog._id : '–')}</Typography>
              </Box>
              <IconButton onClick={() => setDetailDialog(null)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'repeat(12, 1fr)', md: 'repeat(12, 1fr)' } }}>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <Typography variant="h6" gutterBottom>Unternehmensdaten</Typography>
                  <Stack spacing={1}>
                    {detailDialog.companyName && <Typography><strong>Name:</strong> {detailDialog.companyName}</Typography>}
                    {detailDialog.companyUID && <Typography><strong>Company UID:</strong> {detailDialog.companyUID}</Typography>}
                    {detailDialog.codeType && <Typography><strong>Code-Typ:</strong> {detailDialog.codeType}</Typography>}
                    {detailDialog.validFrom && <Typography><strong>Gültig ab:</strong> {new Date(detailDialog.validFrom).toLocaleDateString('de-DE')}</Typography>}
                    {detailDialog.validTo && <Typography><strong>Gültig bis:</strong> {new Date(detailDialog.validTo).toLocaleDateString('de-DE')}</Typography>}
                    {detailDialog.processed_at && <Typography><strong>Verarbeitet am:</strong> {new Date((detailDialog.processed_at as any).$date || detailDialog.processed_at as string).toLocaleString('de-DE')}</Typography>}
                    {detailDialog.editedOn && <Typography><strong>Bearbeitet am:</strong> {new Date(detailDialog.editedOn).toLocaleString('de-DE')}</Typography>}
                    {detailDialog.bdewCodes && detailDialog.bdewCodes.length > 0 && <Typography><strong>BDEW-Codes:</strong> {detailDialog.bdewCodes.join(', ')}</Typography>}
                    {detailDialog.street && <Typography><strong>Straße:</strong> {detailDialog.street}</Typography>}
                    {(detailDialog.postCode || detailDialog.city) && <Typography><strong>Ort:</strong> {detailDialog.postCode} {detailDialog.city}</Typography>}
                    {detailDialog.country && <Typography><strong>Land:</strong> {detailDialog.country}</Typography>}
                    {detailDialog.source && <Typography><strong>Quelle:</strong> {detailDialog.source}</Typography>}
                  </Stack>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <Typography variant="h6" gutterBottom>Kontakte / Marktrollen</Typography>
                  {detailDialog.contacts && detailDialog.contacts.length ? (
                    <List dense>
                      {detailDialog.contacts.map((c: ContactEntry, i: number) => (
                        <ListItem key={i} alignItems="flex-start" disableGutters sx={{ mb: 1 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                {c.BdewCodeFunction && <Chip size="small" label={c.BdewCodeFunction} />}
                                {c.BdewCodeType && <Chip size="small" variant="outlined" label={c.BdewCodeType} />}
                                {c.BdewCodeStatus && <Chip size="small" color="success" variant="outlined" label={c.BdewCodeStatus} />}
                              </Box>
                            }
                            secondary={
                              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                {c.CodeContact && <Typography variant="body2"><strong>Ansprechpartner:</strong> {c.CodeContact}</Typography>}
                                {c.CodeContactPhone && <Typography variant="body2"><strong>Telefon:</strong> {c.CodeContactPhone}</Typography>}
                                {c.CodeContactEmail && <Typography variant="body2"><strong>E-Mail:</strong> {c.CodeContactEmail}</Typography>}
                                {(c.Street || c.PostCode || c.City) && <Typography variant="body2" color="text.secondary">{c.Street ? `${c.Street}, ` : ''}{c.PostCode ? `${c.PostCode} ` : ''}{c.City}{c.Country ? `, ${c.Country}` : ''}</Typography>}
                                {c.BdewCodeStatusBegin && <Typography variant="caption" color="text.secondary">Status seit: {new Date(c.BdewCodeStatusBegin).toLocaleDateString('de-DE')}</Typography>}
                                {c.EditedOn && <Typography variant="caption" color="text.secondary">Bearbeitet: {new Date(c.EditedOn).toLocaleDateString('de-DE')}</Typography>}
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : <Typography variant="body2" color="text.secondary">Keine Kontaktdaten.</Typography>}
                </Box>

                {(detailDialog.allSoftwareSystems && detailDialog.allSoftwareSystems.length > 0) && (
                  <Box sx={{ gridColumn: 'span 12' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><ComputerIcon sx={{ mr: 1 }} />Software-Systeme (aggregiert)</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {detailDialog.allSoftwareSystems.map((system, index) => (
                        <Tooltip key={index} title={system.evidence_text || ''} arrow>
                          <Chip label={`${system.name} (${system.confidence})`} color={getConfidenceColor(system.confidence) as any} variant="outlined" />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                )}

                {detailDialog.findings && detailDialog.findings.length > 0 && (
                  <Box sx={{ gridColumn: 'span 12' }}>
                    <Typography variant="h6" gutterBottom>Datenquellen / Findings</Typography>
                    <List>
                      {detailDialog.findings.map((finding: any, index: number) => (
                        <ListItem key={index} alignItems="flex-start" divider>
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: '0.75rem' }}>{index + 1}</Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={finding.source_url ? (
                              <MuiLink href={finding.source_url} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none' }}>{finding.source_url}</MuiLink>
                            ) : <Typography variant="body2" color="text.secondary">Quelle unbekannt</Typography>}
                            secondary={<Box sx={{ mt: 0.5 }}>
                              {finding.retrieved_at && <Typography variant="caption" color="text.secondary">Abgerufen: {new Date(finding.retrieved_at).toLocaleString('de-DE')}</Typography>}
                              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(finding.software_systems || []).map((system: any, sysIndex: number) => (
                                  <Tooltip key={sysIndex} title={system.evidence_text || ''} arrow>
                                    <Chip size="small" label={`${system.name} (${system.confidence})`} color={getConfidenceColor(system.confidence) as any} variant="outlined" />
                                  </Tooltip>
                                ))}
                              </Box>
                            </Box>}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Generic dump of remaining keys for completeness */}
                <Box sx={{ gridColumn: 'span 12' }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TagIcon fontSize="small" /> Rohdaten</Typography>
                  <Box component="pre" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, maxHeight: 300, overflow: 'auto', fontSize: 12 }}>
                    {JSON.stringify(detailDialog, null, 2)}
                  </Box>
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CodeLookupComponent;
