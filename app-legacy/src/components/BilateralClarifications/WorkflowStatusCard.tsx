import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Button,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Preview as PreviewIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  Note as NoteIcon,
  Launch as LaunchIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';
import { ClarificationStatus, BilateralClarification } from '../../types/bilateral';
import { chatApi } from '../../services/chatApi';
import { notesApi } from '../../services/notesApi';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { LLMEmailComposerDialog } from './LLMEmailComposerDialog';

interface WorkflowStatusCardProps {
  clarification: BilateralClarification;
  onStatusChange?: (newStatus: ClarificationStatus, internalStatus?: string) => void;
  canModify?: boolean;
}

export const WorkflowStatusCard: React.FC<WorkflowStatusCardProps> = ({
  clarification,
  onStatusChange,
  canModify = false
}) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  
  // State für Chat und Notizen
  const [chatDialog, setChatDialog] = useState(false);
  const [noteDialog, setNoteDialog] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [processedNoteContent, setProcessedNoteContent] = useState('');
  
  // State für LLM Email Dialog
  const [llmEmailDialog, setLlmEmailDialog] = useState(false);
  
  // State für Antwort-Verarbeitung Dialog
  const [responseDialog, setResponseDialog] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  
  // State für Wiedereröffnen Dialog
  const [reopenDialog, setReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  // Workflow-Schritte für bilaterale Klärung
  const workflowSteps = [
    {
      id: 'DRAFT',
      label: 'Entwurf erstellen',
      description: 'Klärfall wird angelegt und grundlegende Informationen erfasst',
      icon: <EditIcon />
    },
    {
      id: 'INTERNAL',
      label: 'Interne Klärung',
      description: 'Interner Sachstand zusammentragen, Situation analysieren',
      icon: <SearchIcon />
    },
    {
      id: 'READY_TO_SEND',
      label: 'Bereit zum Versenden',
      description: 'Qualifizierte Anfrage vorbereitet, Freigabe erteilt',
      icon: <PreviewIcon />
    },
    {
      id: 'SENT',
      label: 'An Marktpartner gesendet',
      description: 'Email mit Klärungsanfrage wurde versendet',
      icon: <SendIcon />
    },
    {
      id: 'RESOLVED',
      label: 'Geklärt',
      description: 'Klärfall wurde erfolgreich abgeschlossen',
      icon: <CheckIcon />
    }
  ];

  // Aktueller Schritt ermitteln
  const getCurrentStepIndex = () => {
    switch (clarification.status) {
      case 'DRAFT': return 0;
      case 'INTERNAL': return 1;
      case 'READY_TO_SEND': return 2;
      case 'SENT': 
      case 'PENDING':
      case 'IN_PROGRESS': return 3;
      case 'RESOLVED':
      case 'CLOSED': return 4;
      default: return 0;
    }
  };

  const currentStep = getCurrentStepIndex();

  // Chat für Klärfall starten
  const handleStartChat = async () => {
    try {
      setChatLoading(true);
      const chatTitle = `Klärfall: ${clarification.title}`;
      const newChat = await chatApi.createChat(chatTitle);
      
      // Kontext-Nachricht senden
      const contextMessage = `Ich arbeite an einem Klärfall mit folgenden Details:

**Titel:** ${clarification.title}
**Marktpartner:** ${clarification.marketPartner.companyName} (${clarification.marketPartner.code})
**Marktrolle:** ${clarification.selectedRole}
**Datenaustauschreferenz:** ${clarification.dataExchangeReference.dar}
${clarification.dataExchangeReference.originalMessageType ? `**Nachrichtentyp:** ${clarification.dataExchangeReference.originalMessageType}` : ''}

**Beschreibung:**
${clarification.description}

Kannst du mir dabei helfen, diesen Klärfall zu analysieren und die notwendigen Schritte zu planen?`;

      await chatApi.sendMessage(newChat.id, contextMessage);
      
      // Zu Chat navigieren
      navigate(`/chat/${newChat.id}`);
      showSnackbar('Chat für Klärfall wurde gestartet', 'success');
    } catch (error) {
      console.error('Error starting chat:', error);
      showSnackbar('Fehler beim Starten des Chats', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  // Notiz für Klärfall erstellen
  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      showSnackbar('Bitte Titel und Inhalt eingeben', 'warning');
      return;
    }

    try {
      setNoteLoading(true);
      
      // LLM-basierte Bereinigung und Strukturierung der Notiz
      let finalContent = noteContent;
      
      if (processedNoteContent.trim()) {
        finalContent = `**Originale Notiz:**
${noteContent}

**LLM-verarbeitete Version:**
${processedNoteContent}`;
      }

      const noteData = {
        title: noteTitle,
        content: finalContent,
        tags: ['bilateral-clarification', `clarification-${clarification.id}`],
        source_type: 'manual',
        // source_id: undefined, // UUID field - bilateral clarification IDs are numeric, not UUID
        source_context: `Klärfall: ${clarification.title} - ${clarification.marketPartner.companyName}`
      };

      const newNote = await notesApi.createNote(noteData);
      
      // Dialog schließen und zurücksetzen
      setNoteDialog(false);
      setNoteTitle('');
      setNoteContent('');
      setProcessedNoteContent('');
      
      showSnackbar('Notiz wurde erstellt', 'success');
      
      // Zur Notizen-Übersicht navigieren (mit Filter für diesen Klärfall)
      navigate('/workspace?tab=notes&filter=' + encodeURIComponent(`clarification-${clarification.id}`));
    } catch (error) {
      console.error('Error creating note:', error);
      showSnackbar('Fehler beim Erstellen der Notiz', 'error');
    } finally {
      setNoteLoading(false);
    }
  };

  // LLM-basierte Bereinigung der Notiz
  const handleProcessNote = async () => {
    if (!noteContent.trim()) {
      showSnackbar('Bitte erst Notizinhalt eingeben', 'warning');
      return;
    }

    try {
      setNoteLoading(true);
      
      // Temporären Chat für LLM-Verarbeitung erstellen
      const tempChat = await chatApi.createChat('Notiz-Verarbeitung');
      
      const processingPrompt = `Bitte bereinige und strukturiere folgende Notiz zu einem Klärfall. Mache den Text klarer, strukturierter und professioneller, aber behalte alle wichtigen Informationen bei:

**Klärfall-Kontext:**
- Titel: ${clarification.title}
- Marktpartner: ${clarification.marketPartner.companyName}
- Marktrolle: ${clarification.selectedRole}
- DAR: ${clarification.dataExchangeReference.dar}

**Zu verarbeitende Notiz:**
${noteContent}

Gib eine strukturierte, professionelle Version zurück, die als Arbeitsnotiz für den Klärfall verwendet werden kann.`;

      const response = await chatApi.sendMessage(tempChat.id, processingPrompt);
      setProcessedNoteContent(response.assistantMessage.content);
      
      showSnackbar('Notiz wurde von KI bearbeitet', 'success');
    } catch (error) {
      console.error('Error processing note:', error);
      showSnackbar('Fehler bei der KI-Bearbeitung', 'error');
    } finally {
      setNoteLoading(false);
    }
  };

  // Workflow-Aktionen für aktuellen Status
  const getAvailableActions = () => {
    const actions = [];

    switch (clarification.status) {
      case 'DRAFT':
        actions.push({
          label: 'Interne Klärung beginnen',
          action: () => onStatusChange?.('INTERNAL'),
          color: 'primary' as const
        });
        break;
      
      case 'INTERNAL':
        actions.push({
          label: 'Chat starten',
          action: () => setChatDialog(true),
          color: 'primary' as const,
          icon: <ChatIcon />
        });
        actions.push({
          label: 'Notiz erstellen',
          action: () => setNoteDialog(true),
          color: 'primary' as const,
          icon: <NoteIcon />
        });
        actions.push({
          label: 'Bereit zum Versenden',
          action: () => onStatusChange?.('READY_TO_SEND'),
          color: 'success' as const
        });
        break;
      
      case 'READY_TO_SEND':
        actions.push({
          label: 'An Marktpartner senden',
          action: () => setLlmEmailDialog(true),
          color: 'success' as const,
          icon: <AIIcon />
        });
        break;
      
      case 'SENT':
      case 'PENDING':
      case 'IN_PROGRESS':
        actions.push({
          label: 'Antwort vom Marktpartner verarbeiten',
          action: () => setResponseDialog(true),
          color: 'primary' as const,
          icon: <EmailIcon />
        });
        break;
      
      case 'RESOLVED':
      case 'CLOSED':
        actions.push({
          label: 'Klärfall wiedereröffnen',
          action: () => setReopenDialog(true),
          color: 'warning' as const,
          icon: <EditIcon />
        });
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  // Status-spezifische Hinweise
  const getStatusInfo = () => {
    switch (clarification.status) {
      case 'DRAFT':
        return {
          type: 'info' as const,
          message: 'Klärfall wurde erstellt. Ergänzen Sie Details und beginnen Sie die interne Klärung.'
        };
      case 'INTERNAL':
        return {
          type: 'warning' as const,
          message: 'Sammeln Sie alle relevanten Informationen und klären Sie die Situation intern. Nutzen Sie Chat und Notizen für die Dokumentation, bevor Sie die Anfrage an den Marktpartner senden.'
        };
      case 'READY_TO_SEND':
        return {
          type: 'info' as const,
          message: `Die Anfrage wird an ${clarification.selectedContact?.contactEmail || clarification.marketPartner.contacts[0]?.contactEmail || 'den Marktpartner'} gesendet.`
        };
      case 'SENT':
        return {
          type: 'success' as const,
          message: `Anfrage wurde am ${clarification.lastSentAt ? new Date(clarification.lastSentAt).toLocaleString('de-DE') : 'unbekannt'} versendet. Verarbeiten Sie die Antwort des Marktpartners, sobald sie eingeht.`
        };
      case 'PENDING':
        return {
          type: 'warning' as const,
          message: 'Antwort vom Marktpartner erhalten. Bitte verarbeiten Sie die Antwort und entscheiden Sie über das weitere Vorgehen.'
        };
      case 'IN_PROGRESS':
        return {
          type: 'info' as const,
          message: 'Klärfall wird bearbeitet. Weitere Kommunikation mit dem Marktpartner läuft.'
        };
      case 'RESOLVED':
        return {
          type: 'success' as const,
          message: 'Klärfall wurde erfolgreich abgeschlossen. Bei Bedarf kann der Fall wiedereröffnet werden.'
        };
      case 'CLOSED':
        return {
          type: 'success' as const,
          message: 'Klärfall wurde geschlossen. Bei Bedarf kann der Fall wiedereröffnet werden.'
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  // Handler für LLM Email Dialog Status-Änderungen
  const handleLLMEmailStatusChange = (newStatus: string, action: 'sent' | 'marked_sent' | 'cancelled') => {
    switch (action) {
      case 'sent':
        onStatusChange?.('SENT');
        showSnackbar('Email wurde versendet und Status aktualisiert', 'success');
        break;
      case 'marked_sent':
        onStatusChange?.('SENT');
        showSnackbar('Klärfall als versendet markiert', 'success');
        break;
      case 'cancelled':
        onStatusChange?.('INTERNAL');
        showSnackbar('Vorgang abgebrochen, Status zurückgesetzt', 'info');
        break;
    }
    setLlmEmailDialog(false);
  };

  const handleEmailSent = () => {
    // Wird bereits durch handleLLMEmailStatusChange behandelt
  };

  // Handler für Antwort-Verarbeitung
  const handlePartnerResponse = (shouldClose: boolean) => {
    if (shouldClose) {
      onStatusChange?.('RESOLVED', responseNotes || 'Antwort vom Marktpartner erhalten und Klärfall abgeschlossen.');
    } else {
      onStatusChange?.('INTERNAL', responseNotes || 'Antwort vom Marktpartner erhalten. Weitere interne Klärung erforderlich.');
    }
    setResponseDialog(false);
    setResponseNotes('');
    showSnackbar(shouldClose ? 'Klärfall wurde abgeschlossen' : 'Interne Klärung neu gestartet', 'success');
  };

  // Handler für Wiedereröffnen
  const handleReopenCase = () => {
    onStatusChange?.('INTERNAL', reopenReason || 'Klärfall wurde wiedereröffnet.');
    setReopenDialog(false);
    setReopenReason('');
    showSnackbar('Klärfall wurde wiedereröffnet', 'success');
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Workflow-Status
        </Typography>
        
        <Stepper activeStep={currentStep} orientation="vertical">
          {workflowSteps.map((step, index) => (
            <Step key={step.id}>
              <StepLabel
                icon={step.icon}
                optional={
                  index === currentStep ? (
                    <Chip
                      label="Aktuell"
                      size="small"
                      color="primary"
                    />
                  ) : undefined
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
                
                {index === currentStep && statusInfo && (
                  <Alert severity={statusInfo.type} sx={{ mt: 1, mb: 2 }}>
                    {statusInfo.message}
                  </Alert>
                )}
                
                {index === currentStep && canModify && availableActions.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                      {availableActions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant="contained"
                          color={action.color}
                          onClick={action.action}
                          startIcon={action.icon}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Box>
                    
                    {/* Zusätzliche Navigation-Buttons für INTERNAL Status */}
                    {clarification.status === 'INTERNAL' && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Zur bestehenden Dokumentation:
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ChatIcon />}
                          endIcon={<LaunchIcon />}
                          onClick={() => navigate('/chat')}
                          sx={{ mr: 1 }}
                        >
                          Zu allen Chats
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<NoteIcon />}
                          endIcon={<LaunchIcon />}
                          onClick={() => navigate('/workspace?tab=notes&filter=' + encodeURIComponent(`clarification-${clarification.id}`))}
                        >
                          Zu Klärfall-Notizen
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Email-Informationen wenn versendet */}
        {clarification.status === 'SENT' && clarification.sentToEmail && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Email-Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Empfänger:</strong> {clarification.sentToEmail}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Marktrolle:</strong> {clarification.selectedContact?.roleName || 'Unbekannt'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Ansprechpartner:</strong> {clarification.selectedContact?.contactName || 'Unbekannt'}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Chat-Dialog */}
      <Dialog 
        open={chatDialog} 
        onClose={() => !chatLoading && setChatDialog(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Chat für Klärfall starten</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Ein neuer Chat wird für diesen Klärfall erstellt. Der Chat erhält automatisch 
            alle relevanten Informationen zum Klärfall als Kontext.
          </Typography>
          <Alert severity="info">
            Nach dem Start des Chats werden Sie automatisch zur Chat-Ansicht weitergeleitet.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setChatDialog(false)} 
            disabled={chatLoading}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleStartChat} 
            variant="contained"
            disabled={chatLoading}
            startIcon={chatLoading ? <CircularProgress size={16} /> : <ChatIcon />}
          >
            {chatLoading ? 'Erstelle...' : 'Chat starten'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notiz-Dialog */}
      <Dialog 
        open={noteDialog} 
        onClose={() => !noteLoading && setNoteDialog(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Notiz für Klärfall erstellen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Erstellen Sie eine Notiz, um Informationen zu diesem Klärfall zu sammeln. 
            Die KI kann Ihnen dabei helfen, den Text zu strukturieren und zu verbessern.
          </Typography>
          
          <TextField
            fullWidth
            label="Titel"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            margin="normal"
            placeholder={`Notiz zu ${clarification.title}`}
          />
          
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Notizinhalt"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            margin="normal"
            placeholder="Beschreiben Sie hier die gesammelten Informationen, Erkenntnisse oder Fragen zum Klärfall..."
          />
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              onClick={handleProcessNote}
              disabled={!noteContent.trim() || noteLoading}
              startIcon={noteLoading ? <CircularProgress size={16} /> : <AIIcon />}
              variant="outlined"
            >
              {noteLoading ? 'Verarbeite...' : 'Von KI bearbeiten lassen'}
            </Button>
          </Box>
          
          {processedNoteContent && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                KI-bearbeitete Version:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={processedNoteContent}
                onChange={(e) => setProcessedNoteContent(e.target.value)}
                margin="normal"
                variant="outlined"
                label="Bearbeitete Version (editierbar)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setNoteDialog(false);
              setNoteTitle('');
              setNoteContent('');
              setProcessedNoteContent('');
            }} 
            disabled={noteLoading}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateNote} 
            variant="contained"
            disabled={!noteTitle.trim() || !noteContent.trim() || noteLoading}
            startIcon={noteLoading ? <CircularProgress size={16} /> : <NoteIcon />}
          >
            {noteLoading ? 'Erstelle...' : 'Notiz erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LLM Email Composer Dialog */}
      <LLMEmailComposerDialog
        open={llmEmailDialog}
        onClose={() => setLlmEmailDialog(false)}
        onEmailSent={handleEmailSent}
        onStatusChange={handleLLMEmailStatusChange}
        clarification={clarification}
      />

      {/* Antwort-Verarbeitung Dialog */}
      <Dialog 
        open={responseDialog} 
        onClose={() => setResponseDialog(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Antwort vom Marktpartner verarbeiten</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Sie haben eine Antwort vom Marktpartner erhalten. Wählen Sie die weitere Vorgehensweise:
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Zusätzliche Notizen zur Antwort (optional)"
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            margin="normal"
            placeholder="Beschreiben Sie die erhaltene Antwort und Ihre Bewertung..."
          />
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <Button 
              onClick={() => handlePartnerResponse(true)}
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              sx={{ flex: 1 }}
            >
              Klärfall abschließen
            </Button>
            <Button 
              onClick={() => handlePartnerResponse(false)}
              variant="contained"
              color="warning"
              startIcon={<EditIcon />}
              sx={{ flex: 1 }}
            >
              Interne Klärung fortsetzen
            </Button>
          </Box>
          <Button 
            onClick={() => setResponseDialog(false)}
            color="inherit"
            sx={{ width: '100%' }}
          >
            Abbrechen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wiedereröffnen Dialog */}
      <Dialog 
        open={reopenDialog} 
        onClose={() => setReopenDialog(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Klärfall wiedereröffnen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Der Klärfall wird wiedereröffnet und erhält den Status "Interne Klärung". 
            Dies erstellt einen neuen Eintrag in der Timeline.
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Grund für Wiedereröffnung"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            margin="normal"
            placeholder="Beschreiben Sie, warum der Klärfall wiedereröffnet werden muss..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setReopenDialog(false)}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleReopenCase}
            variant="contained"
            color="warning"
            startIcon={<EditIcon />}
          >
            Wiedereröffnen
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default WorkflowStatusCard;
