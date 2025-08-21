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
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

// Types
import { 
  BilateralClarification, 
  ClarificationStatus, 
  ClarificationPriority 
} from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';
import { WorkflowStatusCard } from './WorkflowStatusCard';
import { EmailComposerDialog, EmailData } from './EmailComposerDialog';
import { ClarificationTimeline } from './ClarificationTimeline';
import { ClarificationReferences } from './ClarificationReferences';

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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

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
      
      // Fetch notes from the general notes API that are tagged with this clarification
      try {
        const notesResponse = await fetch(`/api/notes?tags=clarification-${clarificationId}&limit=50`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          // Add the notes to the clarification data
          data.notes = notesData.notes || [];
        } else {
          data.notes = [];
        }
      } catch (notesError) {
        console.warn('Could not load notes:', notesError);
        data.notes = [];
      }
      
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

  const handleStatusChange = async (newStatus: ClarificationStatus, internalStatus?: string) => {
    if (!clarification) return;
    
    setLoading(true);
    try {
      // Kontextspezifische Nachrichten erstellen
      let statusMessage = '';
      const oldStatus = clarification.status;
      
      if (oldStatus === 'SENT' && newStatus === 'RESOLVED') {
        statusMessage = 'Antwort vom Marktpartner erhalten - Klärfall als abgeschlossen markiert';
      } else if (oldStatus === 'SENT' && newStatus === 'INTERNAL') {
        statusMessage = 'Antwort vom Marktpartner erhalten - Weitere interne Klärung erforderlich';
      } else if ((oldStatus === 'RESOLVED' || oldStatus === 'CLOSED') && newStatus === 'INTERNAL') {
        statusMessage = 'Klärfall wiedereröffnet - Erneute interne Klärung begonnen';
      } else if (oldStatus === 'READY_TO_SEND' && newStatus === 'SENT') {
        statusMessage = 'Anfrage an Marktpartner versendet';
      } else if (oldStatus === 'INTERNAL' && newStatus === 'READY_TO_SEND') {
        statusMessage = 'Interne Klärung abgeschlossen - Bereit zum Versenden';
      } else if (oldStatus === 'DRAFT' && newStatus === 'INTERNAL') {
        statusMessage = 'Interne Klärung begonnen';
      } else {
        statusMessage = `Status geändert von "${oldStatus}" zu "${newStatus}"`;
      }
      
      await bilateralClarificationService.updateClarificationStatus(
        clarification.id, 
        newStatus, 
        internalStatus, 
        statusMessage
      );
      await loadClarification();
      onUpdate();
    } catch (err) {
      setError('Fehler beim Aktualisieren des Status');
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (emailData: EmailData) => {
    if (!clarification) return;
    
    setLoading(true);
    try {
      await bilateralClarificationService.sendClarificationEmail(clarification.id, emailData);
      await loadClarification();
      onUpdate();
      setEmailDialogOpen(false);
    } catch (err) {
      setError('Fehler beim Versenden der E-Mail');
      console.error('Error sending email:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ClarificationStatus) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'INTERNAL': return 'warning';
      case 'READY_TO_SEND': return 'info';
      case 'SENT': return 'primary';
      case 'PENDING': return 'primary';
      case 'IN_PROGRESS': return 'info';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'success';
      case 'ESCALATED': return 'error';
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
                  <Typography variant="body1">
                    {clarification.marketPartner.companyName} ({clarification.marketPartner.code})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rolle: {clarification.selectedContact?.roleName || 'Nicht angegeben'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Datenaustauschreferenz (DAR)</Typography>
                  <Typography variant="body1">{clarification.dataExchangeReference.dar}</Typography>
                  {clarification.dataExchangeReference.originalMessageType && (
                    <Typography variant="body2" color="text.secondary">
                      Nachrichtentyp: {clarification.dataExchangeReference.originalMessageType}
                    </Typography>
                  )}
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
              <Tab label="Workflow" />
              <Tab label="Timeline" />
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
                  clarification ? (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                      <Box sx={{ flex: 2 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Klärfall-Details
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="h6" gutterBottom>Beschreibung</Typography>
                            <Typography variant="body1" paragraph>
                              {clarification.description || 'Keine Beschreibung verfügbar'}
                            </Typography>
                            {clarification.tags && clarification.tags.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" gutterBottom>Tags</Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                  {clarification.tags.map((tag, index) => (
                                    <Chip key={index} label={tag} size="small" variant="outlined" />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 280 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Marktpartner-Info
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">Unternehmen</Typography>
                            <Typography variant="body1" gutterBottom>
                              {clarification.marketPartner.companyName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Code</Typography>
                            <Typography variant="body1" gutterBottom>
                              {clarification.marketPartner.code} ({clarification.marketPartner.codeType.toUpperCase()})
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Marktrolle</Typography>
                            <Typography variant="body1" gutterBottom>
                              {clarification.selectedContact?.roleName || 'Nicht angegeben'}
                            </Typography>
                            {clarification.selectedContact?.contactEmail && (
                              <>
                                <Typography variant="body2" color="text.secondary">E-Mail</Typography>
                                <Typography variant="body1" gutterBottom>
                                  {clarification.selectedContact.contactEmail}
                                </Typography>
                              </>
                            )}
                            {clarification.selectedContact?.contactName && (
                              <>
                                <Typography variant="body2" color="text.secondary">Ansprechpartner</Typography>
                                <Typography variant="body1">
                                  {clarification.selectedContact.contactName}
                                </Typography>
                              </>
                            )}
                          </CardContent>
                        </Card>
                        <Card sx={{ mt: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>DAR-Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">Datenaustauschreferenz</Typography>
                            <Typography variant="body1" gutterBottom>
                              {clarification.dataExchangeReference?.dar || 'Nicht angegeben'}
                            </Typography>
                            {clarification.dataExchangeReference?.originalMessageType && (
                              <>
                                <Typography variant="body2" color="text.secondary">Nachrichtentyp</Typography>
                                <Typography variant="body1" gutterBottom>
                                  {clarification.dataExchangeReference.originalMessageType}
                                </Typography>
                              </>
                            )}
                            {clarification.dataExchangeReference?.businessCase && (
                              <>
                                <Typography variant="body2" color="text.secondary">Geschäftsvorfall</Typography>
                                <Typography variant="body1">
                                  {clarification.dataExchangeReference.businessCase}
                                </Typography>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    </Box>
                  ) : null
                )}
              </Box>
            </TabPanel>

            {/* Workflow Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box p={2}>
                <WorkflowStatusCard
                  clarification={clarification}
                  onStatusChange={handleStatusChange}
                  canModify={true}
                />
                
                {/* Zusätzliche Chat- und Notiz-Links für Status INTERNAL */}
                {clarification.status === 'INTERNAL' && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Dokumentation und Zusammenarbeit
                    </Typography>
                    
                    {/* Referenzen-Management-Komponente */}
                    <ClarificationReferences 
                      clarification={clarification}
                      onUpdate={() => {
                        loadClarification();
                        onUpdate();
                      }}
                    />
                  </Box>
                )}
                
                {(clarification.status === 'READY_TO_SEND' || clarification.status === 'SENT') && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<EmailIcon />}
                      onClick={() => setEmailDialogOpen(true)}
                      disabled={!clarification.selectedContact?.contactEmail}
                    >
                      {clarification.status === 'SENT' ? 'Erneut senden' : 'E-Mail versenden'}
                    </Button>
                    
                    {!clarification.selectedContact?.contactEmail && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Keine E-Mail-Adresse für den ausgewählten Marktpartner hinterlegt.
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>
            </TabPanel>

            {/* Timeline Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box p={2}>
                <ClarificationTimeline
                  clarification={clarification}
                  notes={clarification.notes || []}
                  emails={clarification.emails || []}
                  attachments={clarification.attachments || []}
                  onUpdate={() => {
                    loadClarification();
                    onUpdate();
                  }}
                />
              </Box>
            </TabPanel>

            {/* Anhänge Tab */}
            <TabPanel value={activeTab} index={3}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>Anhänge</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hier können Sie relevante Dokumente wie EDIFACT-Nachrichten hochladen.
                </Typography>
                {/* TODO: Implement attachment management */}
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
            <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
              Speichern
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setEditing(true)} startIcon={<EditIcon />}>
              Bearbeiten
            </Button>
          </>
        )}
      </DialogActions>

      {/* Email Composer Dialog */}
      {clarification && (
        <EmailComposerDialog
          open={emailDialogOpen}
          onClose={() => setEmailDialogOpen(false)}
          onSend={handleSendEmail}
          clarification={clarification}
        />
      )}
    </Dialog>
  );
};

export default ClarificationDetailModal;
