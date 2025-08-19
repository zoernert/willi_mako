import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  ListItemText,
  ListItemIcon,
  Alert,
  Button,
  CircularProgress,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Web as WebIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { MarketPartnerInfo, MarketPartnerContact, MarketRole } from '../../types/bilateral';
import codeLookupApi, { UnifiedCodeSearchResult } from '../../services/codeLookupApi';

// Deutsche Bezeichnungen für Marktrollen
const MARKET_ROLE_LABELS: Record<MarketRole, string> = {
  'LF': 'Lieferant',
  'VNB': 'Verteilnetzbetreiber', 
  'MSB': 'Messstellenbetreiber',
  'MST': 'Messstellenbetreiber (alt)',
  'UNB': 'Übertragungsnetzbetreiber',
  'NB': 'Netzbetreiber',
  'RLM': 'Reallastmessung',
  'SLP': 'Standardlastprofil',
  'BK': 'Bilanzkreis',
  'BKV': 'Bilanzkreisverantwortlicher',
  'BIKO': 'Bilanzkoordinator',
  'MA': 'Marktakteur',
  'OTHER': 'Sonstige'
};

interface MarketPartnerSelectorProps {
  value?: MarketPartnerInfo;
  selectedRole?: MarketRole;
  selectedContact?: MarketPartnerContact;
  onPartnerChange: (partner: MarketPartnerInfo | null) => void;
  onRoleChange: (role: MarketRole | null) => void;
  onContactChange: (contact: MarketPartnerContact | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

export const MarketPartnerSelector: React.FC<MarketPartnerSelectorProps> = ({
  value,
  selectedRole,
  selectedContact,
  onPartnerChange,
  onRoleChange,
  onContactChange,
  disabled = false,
  required = false,
  error = false,
  helperText
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedCodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Konvertiere Suchergebnis zu MarketPartnerInfo
  const convertToMarketPartnerInfo = (result: UnifiedCodeSearchResult): MarketPartnerInfo => {
    const contacts: MarketPartnerContact[] = [];
    
    // Fallback für Legacy-Format
    if (result.contact?.email || result.contact?.name) {
      contacts.push({
        role: 'OTHER',
        roleName: 'Allgemein',
        contactName: result.contact?.name,
        contactEmail: result.contact?.email,
        contactPhone: result.contact?.phone,
        isDefault: true
      });
    }
    
    // Neue Format mit mehreren Kontakten
    if (result.contacts?.length) {
      result.contacts.forEach(contact => {
        if (contact.CodeContactEmail || contact.CodeContact) {
          // Versuche Rolle aus BdewCodeFunction zu extrahieren
          let role: MarketRole = 'OTHER';
          const roleMapping: Record<string, MarketRole> = {
            'LF': 'LF',
            'VNB': 'VNB', 
            'MSB': 'MSB',
            'UNB': 'UNB',
            'LIEFERANT': 'LF',
            'VERTEILNETZBETREIBER': 'VNB',
            'MESSSTELLENBETREIBER': 'MSB'
          };
          
          if (contact.BdewCodeFunction) {
            const func = contact.BdewCodeFunction.toUpperCase();
            role = roleMapping[func] || 'OTHER';
          }
          
          contacts.push({
            role,
            roleName: MARKET_ROLE_LABELS[role],
            contactName: contact.CodeContact,
            contactEmail: contact.CodeContactEmail,
            contactPhone: contact.CodeContactPhone,
            isDefault: contacts.length === 0,
            // Zusätzliche EIC-Informationen, wenn vorhanden
            EIC_Typ: contact.EIC_Typ,
            EIC_Code: contact.EIC_Code,
            EIC_Display_Name: contact.EIC_Display_Name,
            EIC_Long_Name: contact.EIC_Long_Name,
            Website: contact.Website,
            UstId: contact.UstId,
            EIC_Function: contact.EIC_Function
          });
        }
      });
    }
    
    // Mindestens einen Standard-Kontakt sicherstellen
    if (contacts.length === 0) {
      contacts.push({
        role: 'OTHER',
        roleName: 'Allgemein',
        isDefault: true
      });
    }

    return {
      code: result.code || result.bdewCodes?.[0] || '',
      codeType: result.source === 'eic' ? 'eic' : 'bdew',
      companyName: result.companyName || '',
      companyUID: result.companyUID,
      street: result.street,
      postCode: result.postCode,
      city: result.city,
      country: result.country,
      contacts,
      validFrom: result.validFrom,
      validTo: result.validTo,
      lastUpdated: result.editedOn
    };
  };

  // Marktpartner suchen
  const handleSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await codeLookupApi.searchCodes(query);
      setSearchResults(response.results || []);
      setSearchOpen(true);
    } catch (error) {
      console.error('Fehler bei Marktpartnersuche:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Marktpartner auswählen
  const handlePartnerSelect = (result: UnifiedCodeSearchResult) => {
    const partner = convertToMarketPartnerInfo(result);
    onPartnerChange(partner);
    setSearchOpen(false);
    
    // Automatisch ersten verfügbaren Kontakt und Rolle auswählen
    if (partner.contacts.length > 0) {
      const defaultContact = partner.contacts.find(c => c.isDefault) || partner.contacts[0];
      onRoleChange(defaultContact.role);
      onContactChange(defaultContact);
    }
  };

  // Rolle ändern -> passenden Kontakt suchen
  const handleRoleChange = (role: MarketRole) => {
    onRoleChange(role);
    
    if (value?.contacts) {
      const contactForRole = value.contacts.find(c => c.role === role);
      onContactChange(contactForRole || null);
    }
  };

  // Verfügbare Rollen für ausgewählten Marktpartner
  const availableRoles = value?.contacts.map(c => c.role) || [];
  const uniqueRoles = Array.from(new Set(availableRoles));

  return (
    <Box>
      {/* Marktpartner-Suche */}
      <Autocomplete
        open={searchOpen}
        onOpen={() => setSearchOpen(true)}
        onClose={() => setSearchOpen(false)}
        options={searchResults}
        loading={loading}
        getOptionLabel={(option) => option.companyName || option.code || ''}
        filterOptions={(x) => x} // Keine lokale Filterung
        renderInput={(params) => (
          <TextField
            {...params}
            label="Marktpartner suchen"
            placeholder="Firmenname oder BDEW/EIC-Code eingeben..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            error={error}
            helperText={helperText}
            required={required}
            disabled={disabled}
            InputProps={{
              ...params.InputProps,
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props} onClick={() => handlePartnerSelect(option)}>
            <ListItemIcon>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText
              primary={option.companyName}
              secondary={`${option.code || option.bdewCodes?.[0]} • ${option.city || 'Keine Stadt'}`}
            />
          </Box>
        )}
        noOptionsText={
          searchQuery.length < 3 
            ? "Mindestens 3 Zeichen eingeben" 
            : "Kein Marktpartner gefunden"
        }
      />

      {/* Ausgewählter Marktpartner */}
      {value && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <BusinessIcon />
              </Avatar>
              <Box flex={1}>
                <Typography variant="h6">{value.companyName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {value.code} • {value.codeType.toUpperCase()}
                </Typography>
                {value.city && (
                  <Typography variant="body2" color="text.secondary">
                    {value.street && `${value.street}, `}{value.postCode} {value.city}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Marktrolle auswählen */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Marktrolle für diese Klärung</InputLabel>
              <Select
                value={selectedRole || ''}
                onChange={(e) => handleRoleChange(e.target.value as MarketRole)}
                label="Marktrolle für diese Klärung"
                required={required}
                disabled={disabled || uniqueRoles.length === 0}
              >
                {uniqueRoles.map(role => (
                  <MenuItem key={role} value={role}>
                    <Chip 
                      label={role} 
                      size="small" 
                      sx={{ mr: 1, minWidth: 40 }}
                      color="primary"
                      variant="outlined"
                    />
                    {MARKET_ROLE_LABELS[role as MarketRole]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Kontakt-Informationen */}
            {selectedContact && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Ansprechpartner für {MARKET_ROLE_LABELS[selectedRole!]}
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {selectedContact.contactName && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2">{selectedContact.contactName}</Typography>
                    </Box>
                  )}
                  {selectedContact.contactEmail && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2">{selectedContact.contactEmail}</Typography>
                    </Box>
                  )}
                  {selectedContact.contactPhone && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{selectedContact.contactPhone}</Typography>
                    </Box>
                  )}
                  
                  {/* Zusätzliche EIC-Informationen */}
                  {selectedContact.EIC_Code && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <AssignmentIcon fontSize="small" color="action" />
                      <Typography variant="body2">EIC Code: {selectedContact.EIC_Code}</Typography>
                    </Box>
                  )}
                  {selectedContact.EIC_Display_Name && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <BusinessIcon fontSize="small" color="action" />
                      <Typography variant="body2">EIC Name: {selectedContact.EIC_Display_Name}</Typography>
                    </Box>
                  )}
                  {selectedContact.EIC_Long_Name && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <BusinessIcon fontSize="small" color="action" />
                      <Typography variant="body2">EIC Vollname: {selectedContact.EIC_Long_Name}</Typography>
                    </Box>
                  )}
                  {selectedContact.EIC_Typ && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <AssignmentIcon fontSize="small" color="action" />
                      <Typography variant="body2">EIC Typ: {selectedContact.EIC_Typ}</Typography>
                    </Box>
                  )}
                  {selectedContact.EIC_Function && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <AssignmentIcon fontSize="small" color="action" />
                      <Typography variant="body2">EIC Funktion: {selectedContact.EIC_Function}</Typography>
                    </Box>
                  )}
                  {selectedContact.Website && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <WebIcon fontSize="small" color="action" />
                      <Typography variant="body2">Website: {selectedContact.Website}</Typography>
                    </Box>
                  )}
                  {selectedContact.UstId && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <AssignmentIcon fontSize="small" color="action" />
                      <Typography variant="body2">USt-ID: {selectedContact.UstId}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Warnung wenn kein Kontakt für Rolle */}
            {selectedRole && !selectedContact && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Für die Rolle "{MARKET_ROLE_LABELS[selectedRole]}" ist kein Ansprechpartner hinterlegt.
                Die Mail muss manuell versendet werden.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MarketPartnerSelector;
