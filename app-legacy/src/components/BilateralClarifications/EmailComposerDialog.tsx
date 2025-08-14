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
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Preview as PreviewIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { BilateralClarification } from '../../types/bilateral';

interface EmailComposerDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => Promise<void>;
  clarification: BilateralClarification;
}

export interface EmailData {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  includeAttachments: boolean;
  attachmentIds?: number[];
}

export const EmailComposerDialog: React.FC<EmailComposerDialogProps> = ({
  open,
  onClose,
  onSend,
  clarification
}) => {
  const [emailData, setEmailData] = useState<EmailData>({
    to: '',
    cc: '',
    subject: '',
    body: '',
    includeAttachments: false,
    attachmentIds: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  // Email-Daten initialisieren wenn Dialog geöffnet wird
  useEffect(() => {
    if (open && clarification) {
      const recipientEmail = clarification.selectedContact?.contactEmail || 
                           clarification.marketPartner.contacts[0]?.contactEmail || '';
      
      const subject = `Bilaterale Klärung: ${clarification.title} (DAR: ${clarification.dataExchangeReference.dar})`;
      
      const body = generateEmailTemplate(clarification);

      setEmailData({
        to: recipientEmail,
        cc: '',
        subject,
        body,
        includeAttachments: false,
        attachmentIds: clarification.attachments?.map(att => att.id) || []
      });
    }
  }, [open, clarification]);

  // Email-Template generieren
  const generateEmailTemplate = (clarification: BilateralClarification): string => {
    const contactName = clarification.selectedContact?.contactName || 'Damen und Herren';
    const companyName = clarification.marketPartner.companyName;
    const role = clarification.selectedContact?.roleName || 'Marktpartner';
    const dar = clarification.dataExchangeReference.dar;
    const messageType = clarification.dataExchangeReference.originalMessageType || 'EDIFACT-Nachricht';

    return `Sehr geehrte${contactName.includes('Herr') ? 'r' : contactName.includes('Frau') ? '' : ' Damen und'} ${contactName},

wir wenden uns an Sie bezüglich einer bilateralen Klärung im Rahmen der Marktkommunikation.

**Klärfall-Details:**
- Titel: ${clarification.title}
- Datenaustauschreferenz (DAR): ${dar}
- Nachrichtentyp: ${messageType}
- Marktrolle: ${role}
- Erstellt am: ${new Date(clarification.createdAt).toLocaleDateString('de-DE')}

**Beschreibung des Problems:**
${clarification.description || 'Nähere Details entnehmen Sie bitte den beigefügten Unterlagen.'}

**Gewünschte Aktion:**
Wir bitten Sie um Prüfung des oben genannten Sachverhalts und um Rückmeldung bezüglich einer möglichen Korrektur oder weiteren Klärung.

Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Marktkommunikations-Team

---
Diese E-Mail wurde automatisch aus dem Willi-Mako System generiert.
Klärfall-ID: ${clarification.id}
`;
  };

  const handleInputChange = (field: keyof EmailData, value: any) => {
    setEmailData(prev => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validierung
      if (!emailData.to.trim()) {
        setError('Empfänger ist erforderlich');
        return;
      }

      if (!emailData.subject.trim()) {
        setError('Betreff ist erforderlich');
        return;
      }

      if (!emailData.body.trim()) {
        setError('Nachricht ist erforderlich');
        return;
      }

      await onSend(emailData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Versenden der E-Mail');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setPreview(!preview);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon />
          Klärungsanfrage per E-Mail versenden
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Empfänger-Informationen */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Empfänger-Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip
              label={`${clarification.marketPartner.companyName} (${clarification.marketPartner.code})`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={clarification.selectedContact?.roleName || 'Marktpartner'}
              color="secondary"
              variant="outlined"
            />
          </Box>

          {clarification.selectedContact?.contactName && (
            <Typography variant="body2" color="text.secondary">
              <strong>Ansprechpartner:</strong> {clarification.selectedContact.contactName}
            </Typography>
          )}
        </Box>

        {/* Email-Formular */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="An"
            value={emailData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            fullWidth
            required
            type="email"
          />

          <TextField
            label="CC (optional)"
            value={emailData.cc}
            onChange={(e) => handleInputChange('cc', e.target.value)}
            fullWidth
            type="email"
            helperText="Mehrere E-Mail-Adressen mit Komma trennen"
          />

          <TextField
            label="Betreff"
            value={emailData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            fullWidth
            required
          />

          {/* Anhänge */}
          {clarification.attachments && clarification.attachments.length > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={emailData.includeAttachments}
                  onChange={(e) => handleInputChange('includeAttachments', e.target.checked)}
                />
              }
              label={`Anhänge einschließen (${clarification.attachments.length} Dateien)`}
            />
          )}

          {/* Nachricht */}
          {preview ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Vorschau:
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  backgroundColor: 'grey.50',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                {emailData.body}
              </Box>
            </Box>
          ) : (
            <TextField
              label="Nachricht"
              value={emailData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              fullWidth
              required
              multiline
              rows={12}
              helperText="Sie können diese Vorlage nach Bedarf anpassen"
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Abbrechen
        </Button>
        
        <Button
          onClick={handlePreview}
          variant="outlined"
          startIcon={<PreviewIcon />}
          disabled={loading}
        >
          {preview ? 'Bearbeiten' : 'Vorschau'}
        </Button>
        
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={loading || !emailData.to || !emailData.subject || !emailData.body}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          {loading ? 'Wird gesendet...' : 'Senden'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailComposerDialog;
