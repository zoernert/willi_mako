// Detail-Modal für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Vereinfachtes Modal zur Anzeige und Bearbeitung von Klärfall-Details

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

// Types
import { 
  BilateralClarification, 
  ClarificationStatus, 
  ClarificationPriority 
} from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';

interface ClarificationDetailModalProps {
  open: boolean;
  clarificationId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export const ClarificationDetailModal: React.FC<ClarificationDetailModalProps> = ({
  open,
  clarificationId,
  onClose,
  onUpdate
}) => {
  const [clarification, setClarification] = useState<BilateralClarification | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<Partial<BilateralClarification>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && clarificationId) {
      loadClarification();
    }
  }, [open, clarificationId]);

  const loadClarification = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bilateralClarificationService.getById(clarificationId);
      setClarification(data);
      setFormData(data);
    } catch (err) {
      setError('Fehler beim Laden des Klärfalls');
      console.error('Error loading clarification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clarification) return;
    
    setLoading(true);
    try {
      await bilateralClarificationService.update(clarification.id.toString(), formData);
      await loadClarification();
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError('Fehler beim Speichern');
      console.error('Error saving clarification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BilateralClarification, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: ClarificationStatus) => {
    switch (status) {
      case 'OPEN': return 'warning';
      case 'IN_PROGRESS': return 'info';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!clarification && !loading) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">
            Klärfall Details
            {clarification && ` - ${clarification.title}`}
          </Typography>
        </Box>
        <Button onClick={onClose} size="small">
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <Typography>Lade...</Typography>
          </Box>
        ) : clarification ? (
          <Box>
            {/* Header Info */}
            <Box p={2}>
              <Box display="flex" gap={2} alignItems="center" mb={2}>
                <Chip 
                  label={clarification.status} 
                  color={getStatusColor(clarification.status)}
                  size="small"
                />
                <Chip 
                  label={clarification.priority} 
                  color="primary"
                  size="small"
                />
                <Chip 
                  label={clarification.caseType} 
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Marktpartner</Typography>
                  <Typography variant="body1">{clarification.marketPartnerName || clarification.marketPartnerCode}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Erstellt</Typography>
                  <Typography variant="body1">{formatDate(clarification.createdAt)}</Typography>
                </Box>
                {clarification.dueDate && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Fällig</Typography>
                    <Typography variant="body1">{formatDate(clarification.dueDate)}</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Details" />
              <Tab label="Notizen" />
              <Tab label="Anhänge" />
            </Tabs>

            {/* Tab Content */}
            <TabPanel value={activeTab} index={0}>
              <Box p={2}>
                {editing ? (
                  <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                      label="Titel"
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Beschreibung"
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      multiline
                      rows={4}
                      fullWidth
                    />
                    <Box display="flex" gap={2}>
                      <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={formData.status || ''}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                        >
                          <MenuItem value="OPEN">Offen</MenuItem>
                          <MenuItem value="IN_PROGRESS">In Bearbeitung</MenuItem>
                          <MenuItem value="RESOLVED">Gelöst</MenuItem>
                          <MenuItem value="CLOSED">Geschlossen</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Priorität</InputLabel>
                        <Select
                          value={formData.priority || ''}
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                        >
                          <MenuItem value="LOW">Niedrig</MenuItem>
                          <MenuItem value="MEDIUM">Mittel</MenuItem>
                          <MenuItem value="HIGH">Hoch</MenuItem>
                          <MenuItem value="CRITICAL">Kritisch</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>Beschreibung</Typography>
                    <Typography variant="body1" paragraph>
                      {clarification.description || 'Keine Beschreibung verfügbar'}
                    </Typography>
                    
                    {clarification.tags.length > 0 && (
                      <Box>
                        <Typography variant="h6" gutterBottom>Tags</Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {clarification.tags.map((tag, index) => (
                            <Chip key={index} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>Notizen</Typography>
                <Typography variant="body2" color="text.secondary">
                  Notizen-Funktionalität wird noch implementiert.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>Anhänge</Typography>
                <Typography variant="body2" color="text.secondary">
                  Anhang-Funktionalität wird noch implementiert.
                </Typography>
              </Box>
            </TabPanel>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)} startIcon={<CancelIcon />}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              Speichern
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Schließen</Button>
            <Button 
              onClick={() => setEditing(true)} 
              variant="contained" 
              startIcon={<EditIcon />}
            >
              Bearbeiten
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
