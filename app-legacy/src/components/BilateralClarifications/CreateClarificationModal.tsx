import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Typography,
  Divider
} from '@mui/material';
import { BilateralClarification, MarketPartnerInfo, MarketPartnerContact, MarketRole, DataExchangeReference } from '../../types/bilateral';
import { MarketPartnerSelector } from './MarketPartnerSelector';
import { DARInput } from './DARInput';
import codeLookupApi from '../../services/codeLookupApi';

interface CreateClarificationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BilateralClarification>) => Promise<void>;
  initialData?: {
    title?: string;
    description?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    marketPartnerCode?: string;
    caseType?: 'GENERAL' | 'TECHNICAL' | 'B2B' | 'B2C';
  };
}

export const CreateClarificationModal: React.FC<CreateClarificationModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'MEDIUM' as any,
    status: 'DRAFT' as any, // Neue bilaterale Klärungen starten immer als DRAFT
    assignedTo: '',
    tags: [] as string[],
    // Neue Pflichtfelder
    marketPartner: null as MarketPartnerInfo | null,
    selectedRole: null as MarketRole | null,
    selectedContact: null as MarketPartnerContact | null,
    dataExchangeReference: null as DataExchangeReference | null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  
  // Automatische Initialisierung des Marktpartners, wenn ein Code vorhanden ist
  useEffect(() => {
    async function initializeMarketPartner() {
      if (initialData?.marketPartnerCode && !formData.marketPartner) {
        try {
          console.log("Suche Marktpartner mit Code:", initialData.marketPartnerCode);
          const marketPartner = await codeLookupApi.findByCode(initialData.marketPartnerCode);
          
          if (marketPartner) {
            console.log("Marktpartner gefunden:", marketPartner);
            
            // MarketPartnerInfo-Objekt erstellen
            const partnerInfo: MarketPartnerInfo = {
              code: marketPartner.code,
              companyName: marketPartner.name,
              codeType: 'bdew', // Standard-Typ setzen, falls nicht verfügbar
              contacts: marketPartner.contacts || [],
              // Weitere Felder aus marketPartner übernehmen, falls vorhanden
              ...(marketPartner.address ? {
                street: marketPartner.address.street,
                postCode: marketPartner.address.postCode,
                city: marketPartner.address.city,
                country: marketPartner.address.country
              } : {})
            };
            
            handleInputChange('marketPartner', partnerInfo);
            
            // Standard-Rolle setzen, falls verfügbar
            if (marketPartner.roles && marketPartner.roles.length > 0) {
              const role = marketPartner.roles[0] as MarketRole;
              handleInputChange('selectedRole', role);
              
              // Passenden Kontakt für die Rolle finden, falls verfügbar
              if (marketPartner.contacts && marketPartner.contacts.length > 0) {
                const contactForRole = marketPartner.contacts.find((c) => c.role === role) || marketPartner.contacts[0];
                handleInputChange('selectedContact', contactForRole);
              }
            }
          } else {
            console.warn("Kein Marktpartner für Code gefunden:", initialData.marketPartnerCode);
          }
        } catch (err) {
          console.error("Fehler beim Laden des Marktpartners:", err);
        }
      }
    }
    
    initializeMarketPartner();
  }, [initialData, formData.marketPartner]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validierung
      if (!formData.title.trim()) {
        setError('Titel ist erforderlich');
        setLoading(false);
        return;
      }

      // Neue Validierungen für bilaterale Klärungen
      if (!formData.marketPartner || !formData.marketPartner.code) {
        console.error("Fehlender Marktpartner:", formData.marketPartner);
        setError('Marktpartner ist erforderlich');
        setLoading(false);
        return;
      }

      if (!formData.selectedRole) {
        setError('Marktrolle ist erforderlich');
        setLoading(false);
        return;
      }

      if (!formData.dataExchangeReference || !formData.dataExchangeReference.isValid) {
        setError('Gültige Datenaustauschreferenz (DAR) ist erforderlich');
        setLoading(false);
        return;
      }

      console.log("Alle Validierungen bestanden, bereite Daten vor:", {
        marketPartner: formData.marketPartner,
        selectedRole: formData.selectedRole,
        dataExchangeReference: formData.dataExchangeReference
      });

      // Daten für Backend vorbereiten
      const clarificationData: Partial<BilateralClarification> = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assignedTo: formData.assignedTo,
        tags: formData.tags,
        marketPartner: formData.marketPartner,
        selectedRole: formData.selectedRole,
        selectedContact: formData.selectedContact || undefined,
        dataExchangeReference: formData.dataExchangeReference,
        // Interne Bearbeitung beginnt als DRAFT
        internalStatus: 'DRAFT'
      };

      await onSubmit(clarificationData);
      onClose();
      
      // Form zurücksetzen
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM' as any,
        status: 'DRAFT' as any,
        assignedTo: '',
        tags: [],
        marketPartner: null,
        selectedRole: null,
        selectedContact: null,
        dataExchangeReference: null
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Klärfalls');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Neuen Klärfall erstellen</DialogTitle>
      
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Titel"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Beschreibung"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            fullWidth
            multiline
            rows={3}
          />

          {/* Marktpartner-Sektion */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Marktpartner und Datenaustauschreferenz
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <MarketPartnerSelector
              value={formData.marketPartner || undefined}
              selectedRole={formData.selectedRole || undefined}
              selectedContact={formData.selectedContact || undefined}
              onPartnerChange={(partner) => handleInputChange('marketPartner', partner)}
              onRoleChange={(role) => handleInputChange('selectedRole', role)}
              onContactChange={(contact) => handleInputChange('selectedContact', contact)}
              required
              error={!formData.marketPartner}
              helperText={!formData.marketPartner ? 'Marktpartner ist erforderlich' : ''}
            />

            <Box sx={{ mt: 2 }}>
              <DARInput
                value={formData.dataExchangeReference || undefined}
                onChange={(dar: DataExchangeReference | null) => handleInputChange('dataExchangeReference', dar)}
                required
                error={!formData.dataExchangeReference || !formData.dataExchangeReference.isValid}
                helperText={!formData.dataExchangeReference ? 'DAR ist erforderlich' : 
                  (!formData.dataExchangeReference.isValid ? 'DAR ist ungültig' : '')}
              />
            </Box>
          </Box>

          <Divider />

          <FormControl fullWidth>
            <InputLabel>Priorität</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              label="Priorität"
            >
              <MenuItem value="LOW">Niedrig</MenuItem>
              <MenuItem value="MEDIUM">Mittel</MenuItem>
              <MenuItem value="HIGH">Hoch</MenuItem>
              <MenuItem value="CRITICAL">Kritisch</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Zugewiesen an"
            value={formData.assignedTo}
            onChange={(e) => handleInputChange('assignedTo', e.target.value)}
            fullWidth
          />

          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                placeholder="Tag hinzufügen"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button onClick={handleAddTag} variant="outlined" size="small">
                Hinzufügen
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Wird erstellt...' : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateClarificationModal;
