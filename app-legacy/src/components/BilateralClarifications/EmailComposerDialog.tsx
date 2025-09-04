import React, { useState, useEffect, useMemo } from 'react';
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
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import {
  Send as SendIcon,
  Preview as PreviewIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { BilateralClarification } from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';
import { useAuth } from '../../contexts/AuthContext';
import { featureFlags } from '../../config/featureFlags';

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
  sendAs?: string; // identity used to send (team or user)
  sendAndWait?: boolean; // when true, set status to SENT and next action +3d on server or via UI flow
}

export const EmailComposerDialog: React.FC<EmailComposerDialogProps> = ({
  open,
  onClose,
  onSend,
  clarification
}) => {
  const { state } = useAuth();
  const currentUser = state.user;
  const [emailData, setEmailData] = useState<EmailData>({
    to: '',
    cc: '',
    subject: '',
    body: '',
    includeAttachments: false,
  attachmentIds: [],
  sendAndWait: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  // Compute default send-as address: prefer team identity if available
  const defaultTeamAddress = 'team@stromhaltig.de';
  const normalizeLocalPart = (s: string) =>
    s
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');

  const userFromAddress = useMemo(() => {
    if (!currentUser) return '';
    // If user already has a stromhaltig.de address, use it
    if (currentUser.email?.endsWith('@stromhaltig.de')) return currentUser.email;
    // Else derive from name or local part
    const base = currentUser.name?.trim() ? currentUser.name : (currentUser.email?.split('@')[0] || 'user');
    return `${normalizeLocalPart(base)}@stromhaltig.de`;
  }, [currentUser]);

  const [sendAs, setSendAs] = useState<string>(defaultTeamAddress);
  const [recipientValidated, setRecipientValidated] = useState<{ valid: boolean; suggestion?: string } | null>(null);

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
        attachmentIds: clarification.attachments?.map(att => att.id) || [],
  sendAs,
  sendAndWait: true
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
    if (field === 'to') {
      setRecipientValidated(null);
    }
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      setError(null);

      // Recipient validation (optional, best-effort)
      try {
        const role = clarification.selectedContact?.role || clarification.selectedRole;
        if (role && clarification.marketPartner.code) {
          const v = await bilateralClarificationService.validateMarketPartnerEmail(
            clarification.marketPartner.code,
            role
          );
          if (v?.isValid === false && v.email) {
            setRecipientValidated({ valid: false, suggestion: v.email });
            // Do not block send; just inform
          } else {
            setRecipientValidated({ valid: true });
          }
        }
      } catch {}

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

  // Resolve final from-address only if feature is enabled
  const fromAddress = sendAs === 'user' ? (userFromAddress || currentUser?.email || defaultTeamAddress) : sendAs;
  const payload = featureFlags.sendAsIdentity.enabled
    ? { ...emailData, sendAs: fromAddress }
    : { ...emailData };

  await onSend(payload);
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
        {recipientValidated && recipientValidated.valid === false && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Empfängeradresse konnte nicht validiert werden. Vorschlag: {recipientValidated.suggestion}
          </Alert>
        )}

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
          {featureFlags.sendAsIdentity.enabled && (
            <>
              <FormControl fullWidth>
                <InputLabel id="send-as-label">Senden als</InputLabel>
                <Select
                  labelId="send-as-label"
                  value={sendAs}
                  label="Senden als"
                  onChange={(e) => setSendAs(e.target.value)}
                >
                  <MenuItem value={defaultTeamAddress}>{defaultTeamAddress} (Team)</MenuItem>
                  <MenuItem value="user">Eigene Adresse (Benutzer){currentUser ? ` — ${userFromAddress || currentUser.email}` : ''}</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Von-Adresse: {sendAs === 'user' ? (userFromAddress || currentUser?.email || defaultTeamAddress) : sendAs}
              </Typography>
            </>
          )}

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

          {/* Senden & warten */}
          <FormControlLabel
            control={
              <Checkbox
                checked={!!emailData.sendAndWait}
                onChange={(e) => handleInputChange('sendAndWait', e.target.checked)}
              />
            }
            label="Senden & warten (Next Action +3 Tage)"
          />

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
