// LLM-basierte Email-Composer für Bilateral Clarifications
// Erstellt: 14. August 2025
// Beschreibung: Komponente für LLM-generierte Email-Vorschläge mit Bearbeitungsmöglichkeiten

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Preview as PreviewIcon,
  Email as EmailIcon,
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import { BilateralClarification } from '../../types/bilateral';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface LLMEmailComposerDialogProps {
  open: boolean;
  onClose: () => void;
  onEmailSent: () => void;
  onStatusChange: (newStatus: string, action: 'sent' | 'marked_sent' | 'cancelled') => void;
  clarification: BilateralClarification;
}

interface EmailSuggestion {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  reasoning?: string;
}

export const LLMEmailComposerDialog: React.FC<LLMEmailComposerDialogProps> = ({
  open,
  onClose,
  onEmailSent,
  onStatusChange,
  clarification
}) => {
  const [emailSuggestion, setEmailSuggestion] = useState<EmailSuggestion | null>(null);
  const [editedEmail, setEditedEmail] = useState<EmailSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Email-Vorschlag beim Öffnen generieren
  useEffect(() => {
    if (open && clarification) {
      generateEmailSuggestion();
    }
  }, [open, clarification]);

  const generateEmailSuggestion = async () => {
    setGenerating(true);
    setError(null);
    
    try {
      // LLM-API aufrufen für Email-Generierung
      const response = await fetch('/api/llm/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          clarification: {
            id: clarification.id,
            title: clarification.title,
            description: clarification.description,
            marketPartner: clarification.marketPartner,
            selectedContact: clarification.selectedContact,
            selectedRole: clarification.selectedRole,
            dataExchangeReference: clarification.dataExchangeReference,
            status: clarification.status,
            notes: clarification.notes || []
          },
          requestType: 'bilateral_clarification_email',
          language: 'de'
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Email-Vorschlags');
      }

      const suggestion = await response.json();
      setEmailSuggestion(suggestion);
      setEditedEmail({ ...suggestion });
    } catch (err) {
      console.error('Error generating email suggestion:', err);
      setError('Fehler beim Generieren des Email-Vorschlags. Fallback-Template wird verwendet.');
      
      // Fallback: Manuell erstellten Email-Vorschlag verwenden
      const fallbackSuggestion = generateFallbackEmail();
      setEmailSuggestion(fallbackSuggestion);
      setEditedEmail({ ...fallbackSuggestion });
    } finally {
      setGenerating(false);
    }
  };

  const generateFallbackEmail = (): EmailSuggestion => {
    const recipientEmail = clarification.selectedContact?.contactEmail || 
                          clarification.marketPartner.contacts?.[0]?.contactEmail || '';
    
    const contactName = clarification.selectedContact?.contactName || 'Damen und Herren';
    const companyName = clarification.marketPartner.companyName;
    const dar = clarification.dataExchangeReference.dar;
    const messageType = clarification.dataExchangeReference.originalMessageType || 'EDIFACT-Nachricht';
    
    // Helper function to get role display name
    const getRoleDisplayName = (role: string): string => {
      const roleNames: Record<string, string> = {
        'LF': 'Lieferant',
        'VNB': 'Verteilnetzbetreiber',
        'MSB': 'Messstellenbetreiber',
        'MST': 'Messstellenbetreiber',
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
      return roleNames[role] || role;
    };
    
    const subject = `Bilaterale Klärung: ${clarification.title} (DAR: ${dar})`;
    
    const body = `Sehr geehrte${contactName.includes('Herr') ? 'r' : contactName.includes('Frau') ? '' : ' Damen und'} ${contactName},

wir wenden uns an Sie bezüglich einer bilateralen Klärung im Rahmen der Marktkommunikation.

**Klärfall-Details:**
- Titel: ${clarification.title}
- Datenaustauschreferenz (DAR): ${dar}
- Nachrichtentyp: ${messageType}
- Marktrolle: ${getRoleDisplayName(clarification.selectedRole)}
- Erstellt am: ${new Date(clarification.createdAt).toLocaleDateString('de-DE')}

**Beschreibung des Problems:**
${clarification.description}

Wir bitten Sie um Prüfung des Sachverhalts und zeitnahe Rückmeldung bezüglich der weiteren Vorgehensweise.

Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Marktkommunikationsteam`;

    return {
      to: recipientEmail,
      cc: '',
      subject,
      body,
      reasoning: 'Automatisch generierte Email basierend auf Klärfall-Informationen'
    };
  };

  const handleInputChange = (field: keyof EmailSuggestion, value: string) => {
    if (editedEmail) {
      setEditedEmail({
        ...editedEmail,
        [field]: value
      });
    }
  };

  const handleSendEmail = async () => {
    if (!editedEmail) return;
    
    setSending(true);
    setError(null);

    try {
      // Email versenden
      const response = await fetch(`/api/bilateral-clarifications/${clarification.id}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          direction: 'OUTGOING',
          subject: editedEmail.subject,
          fromAddress: 'system@company.com', // TODO: Von User-Settings holen
          toAddresses: [editedEmail.to],
          ccAddresses: editedEmail.cc ? editedEmail.cc.split(',').map(e => e.trim()) : [],
          content: editedEmail.body,
          contentType: 'text',
          emailType: 'CLARIFICATION_REQUEST',
          isImportant: true,
          source: 'LLM_GENERATED'
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Versenden der Email');
      }

      showSnackbar('Email erfolgreich versendet', 'success');
      onEmailSent();
      onStatusChange('SENT', 'sent');
      onClose();
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Fehler beim Versenden der Email');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsSent = () => {
    showSnackbar('Klärfall als versendet markiert', 'success');
    onStatusChange('SENT', 'marked_sent');
    onClose();
  };

  const handleCancel = () => {
    onStatusChange('INTERNAL', 'cancelled');
    onClose();
  };

  const resetToOriginal = () => {
    if (emailSuggestion) {
      setEditedEmail({ ...emailSuggestion });
      setIsEditing(false);
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = (role: string): string => {
    const roleNames: Record<string, string> = {
      'LF': 'Lieferant',
      'VNB': 'Verteilnetzbetreiber',
      'MSB': 'Messstellenbetreiber',
      'MST': 'Messstellenbetreiber',
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
    return roleNames[role] || role;
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <AIIcon color="primary" />
          <Typography variant="h6">
            Email an Marktpartner senden
          </Typography>
          {generating && (
            <Box display="flex" alignItems="center" gap={1} ml={2}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Generiere Vorschlag...
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          KI-generierter Email-Vorschlag für {clarification.marketPartner.companyName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {generating && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
          </Box>
        )}

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {editedEmail && (
          <Box>
            {/* Email-Header */}
            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Box display="flex" alignItems="center" justifyContent="between" mb={1}>
                <Typography variant="subtitle2" color="primary">
                  Email-Vorschau
                </Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title="KI-Vorschlag neu generieren">
                    <IconButton size="small" onClick={generateEmailSuggestion} disabled={generating}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Zurück zum Original">
                    <IconButton size="small" onClick={resetToOriginal} disabled={!isEditing}>
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              {emailSuggestion?.reasoning && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {emailSuggestion.reasoning}
                </Typography>
              )}
            </Paper>

            {/* Email-Formular */}
            <Box component="form" noValidate>
              <TextField
                label="An"
                value={editedEmail.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                fullWidth
                margin="normal"
                required
                helperText="Email-Adresse des Marktpartners"
                onFocus={() => setIsEditing(true)}
              />

              <TextField
                label="CC (optional)"
                value={editedEmail.cc || ''}
                onChange={(e) => handleInputChange('cc', e.target.value)}
                fullWidth
                margin="normal"
                helperText="Weitere Empfänger (durch Komma getrennt)"
                onFocus={() => setIsEditing(true)}
              />

              <TextField
                label="Betreff"
                value={editedEmail.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                fullWidth
                margin="normal"
                required
                onFocus={() => setIsEditing(true)}
              />

              <TextField
                label="Nachricht"
                value={editedEmail.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                fullWidth
                multiline
                rows={12}
                margin="normal"
                required
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  }
                }}
                onFocus={() => setIsEditing(true)}
              />
            </Box>

            {/* Klärfall-Info */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Klärfall-Informationen
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip 
                  label={`DAR: ${clarification.dataExchangeReference.dar}`} 
                  size="small" 
                  variant="outlined" 
                />
                <Chip 
                  label={clarification.marketPartner.companyName} 
                  size="small" 
                  variant="outlined" 
                />
                <Chip 
                  label={getRoleDisplayName(clarification.selectedRole)} 
                  size="small" 
                  variant="outlined" 
                />
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Button
            onClick={handleCancel}
            color="secondary"
            startIcon={<CancelIcon />}
          >
            Abbrechen
          </Button>

          <Box display="flex" gap={1}>
            <Button
              onClick={handleMarkAsSent}
              color="info"
              variant="outlined"
              startIcon={<CheckIcon />}
            >
              Bereits gesendet
            </Button>
            
            <Button
              onClick={handleSendEmail}
              color="primary"
              variant="contained"
              startIcon={<SendIcon />}
              disabled={!editedEmail || sending || !editedEmail.to || !editedEmail.subject || !editedEmail.body}
            >
              {sending ? 'Sende...' : 'Direkt senden'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default LLMEmailComposerDialog;
