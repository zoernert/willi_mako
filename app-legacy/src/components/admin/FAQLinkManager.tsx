import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  AutoFixHigh as AutoIcon,
  Link as LinkIcon,
  Analytics as StatsIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { FAQ, LinkedTerm, CreateFAQLinkRequest, FAQLinkingStats } from '../../types/faq';
import apiClient from '../../services/apiClient';

interface FAQLinkManagerProps {
  faqId: string;
  faqTitle: string;
  onClose: () => void;
}

const FAQLinkManager: React.FC<FAQLinkManagerProps> = ({ faqId, faqTitle, onClose }) => {
  const [links, setLinks] = useState<LinkedTerm[]>([]);
  const [availableFAQs, setAvailableFAQs] = useState<FAQ[]>([]);
  const [stats, setStats] = useState<FAQLinkingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Form state for new link
  const [newLink, setNewLink] = useState<CreateFAQLinkRequest>({
    source_faq_id: faqId,
    target_faq_id: '',
    term: '',
    display_text: '',
    is_automatic: false
  });

  useEffect(() => {
    loadData();
  }, [faqId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLinks(),
        loadAvailableFAQs(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Fehler beim Laden der Daten', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async () => {
    try {
      const response = await apiClient.get(`/admin/faqs/${faqId}/links`) as any;
      const data = response?.data || response || [];
      setLinks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading links:', error);
      setLinks([]);
    }
  };

  const loadAvailableFAQs = async () => {
    try {
      const response = await apiClient.get('/faqs?limit=100') as any;
      const data = response?.data || response || [];
      const faqs = Array.isArray(data) ? data.filter((faq: FAQ) => faq.id !== faqId) : [];
      setAvailableFAQs(faqs);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      setAvailableFAQs([]);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/admin/faqs/linking-stats') as any;
      const data = response?.data || response || null;
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    }
  };

  const handleCreateLink = async () => {
    if (!newLink.target_faq_id || !newLink.term) {
      showSnackbar('Bitte füllen Sie alle Pflichtfelder aus', 'warning');
      return;
    }

    try {
      await apiClient.post('/admin/faqs/links', newLink);
      showSnackbar('Verlinkung erfolgreich erstellt', 'success');
      setShowAddDialog(false);
      setNewLink({
        source_faq_id: faqId,
        target_faq_id: '',
        term: '',
        display_text: '',
        is_automatic: false
      });
      loadLinks();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || 'Fehler beim Erstellen der Verlinkung',
        'error'
      );
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!window.confirm('Möchten Sie diese Verlinkung wirklich löschen?')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/faqs/links/${linkId}`);
      showSnackbar('Verlinkung gelöscht', 'success');
      loadLinks();
    } catch (error: any) {
      showSnackbar(
        error?.message || 'Fehler beim Löschen der Verlinkung',
        'error'
      );
    }
  };

  const handleGenerateAutomaticLinks = async () => {
    if (!window.confirm('Möchten Sie automatische Verlinkungen für diese FAQ generieren?')) {
      return;
    }

    try {
      const response = await apiClient.post(`/admin/faqs/${faqId}/generate-links`, {}) as any;
      const created_links = response.data?.created_links || response.created_links || 0;
      showSnackbar(`${created_links} automatische Verlinkungen erstellt`, 'success');
      loadLinks();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || 'Fehler beim Generieren der Verlinkungen',
        'error'
      );
    }
  };

  const getTargetFAQTitle = (targetId: string) => {
    const faq = availableFAQs.find(f => f.id === targetId);
    return faq ? faq.title : 'Unbekannte FAQ';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          FAQ Verlinkungen verwalten
        </Typography>
        <Button onClick={onClose} color="primary">
          Schließen
        </Button>
      </Box>

      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        FAQ: {faqTitle}
      </Typography>

      <Box display="flex" gap={3}>
        <Box sx={{ flex: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Aktuelle Verlinkungen ({links?.length || 0})</Typography>
                <Box>
                  <Button
                    startIcon={<AutoIcon />}
                    onClick={handleGenerateAutomaticLinks}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Auto-Generieren
                  </Button>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddDialog(true)}
                    variant="contained"
                    size="small"
                  >
                    Hinzufügen
                  </Button>
                </Box>
              </Box>

              {(links?.length || 0) === 0 ? (
                <Alert severity="info">
                  Keine Verlinkungen vorhanden. Klicken Sie auf "Auto-Generieren" oder "Hinzufügen".
                </Alert>
              ) : (
                <List>
                  {(links || []).map((link, index) => (
                    <React.Fragment key={link.link_id || index}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <strong>{link.term}</strong>
                              {link.display_text && link.display_text !== link.term && (
                                <Chip size="small" label={`als "${link.display_text}"`} />
                              )}
                            </Box>
                          }
                          secondary={`Verlinkt zu: ${getTargetFAQTitle(link.target_faq_id)}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteLink(link.link_id!)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < (links?.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Statistiken</Typography>
                <IconButton onClick={() => setShowStatsDialog(true)}>
                  <StatsIcon />
                </IconButton>
              </Box>
              
              {stats && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Gesamt: {stats.total_links} Verlinkungen
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Automatisch: {stats.automatic_links}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Manuell: {stats.manual_links}
                  </Typography>
                  {stats.most_linked_faq && (
                    <Typography variant="body2" gutterBottom>
                      Meist verlinkt: {stats.most_linked_faq.title} ({stats.most_linked_faq.link_count}x)
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Add Link Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neue Verlinkung hinzufügen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Begriff"
              value={newLink.term}
              onChange={(e) => setNewLink({ ...newLink, term: e.target.value })}
              margin="normal"
              required
              helperText="Der Begriff, der verlinkt werden soll"
            />
            
            <TextField
              fullWidth
              label="Anzeigetext (optional)"
              value={newLink.display_text}
              onChange={(e) => setNewLink({ ...newLink, display_text: e.target.value })}
              margin="normal"
              helperText="Alternativer Text für die Anzeige"
            />
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Ziel-FAQ</InputLabel>
              <Select
                value={newLink.target_faq_id}
                onChange={(e) => setNewLink({ ...newLink, target_faq_id: e.target.value })}
              >
                {(availableFAQs || []).map((faq) => (
                  <MenuItem key={faq.id} value={faq.id}>
                    {faq.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateLink} variant="contained">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FAQLinkManager;
