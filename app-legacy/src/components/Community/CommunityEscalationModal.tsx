import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Groups as CommunityIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface CommunityEscalationModalProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  chatId?: string;
}

interface ThreadDraft {
  title: string;
  problem_description: string;
  context: string;
  tags: string[];
}

const CommunityEscalationModal: React.FC<CommunityEscalationModalProps> = ({
  open,
  onClose,
  messages,
  chatId
}) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ThreadDraft | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  
  // Markdown editor state
  const [descriptionEditMode, setDescriptionEditMode] = useState<'write' | 'preview'>('write');

  // Simple Markdown Editor Component
  const SimpleMarkdownEditor: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    editMode: 'write' | 'preview';
    onModeChange: (mode: 'write' | 'preview') => void;
  }> = ({ value, onChange, placeholder, rows = 4, editMode, onModeChange }) => {
    return (
      <Box>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs value={editMode} onChange={(_, newValue) => onModeChange(newValue)}>
            <Tab label="Schreiben" value="write" />
            <Tab label="Vorschau" value="preview" />
          </Tabs>
        </Box>
        
        {editMode === 'write' ? (
          <TextField
            fullWidth
            multiline
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            helperText="Markdown wird unterstützt"
          />
        ) : (
          <Box
            sx={{
              minHeight: `${rows * 24}px`,
              p: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'grey.50'
            }}
          >
            {value ? (
              <ReactMarkdown>{value}</ReactMarkdown>
            ) : (
              <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Vorschau wird hier angezeigt...
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // Generate initial draft when modal opens
  React.useEffect(() => {
    if (open && messages.length > 0 && !draft) {
      generateDraft();
    }
  }, [open, messages]);

  const generateDraft = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Extract context from recent messages
      const recentMessages = messages.slice(-10); // Last 10 messages
      const userMessages = recentMessages.filter(m => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      
      if (!lastUserMessage) {
        throw new Error('Keine Nutzerfrage gefunden');
      }

      // Generate a draft using simple extraction
      const context = recentMessages
        .filter(m => m.role === 'assistant')
        .map(m => m.content)
        .join(' ')
        .substring(0, 500);

      const generatedDraft: ThreadDraft = {
        title: lastUserMessage.content.length > 80 
          ? lastUserMessage.content.substring(0, 77) + '...'
          : lastUserMessage.content,
        problem_description: lastUserMessage.content,
        context: context || 'Kontext aus Chat-Unterhaltung extrahiert',
        tags: ['Energiewirtschaft', 'Chat-Eskalation']
      };

      setDraft(generatedDraft);
    } catch (err) {
      console.error('Error generating draft:', err);
      setError('Fehler beim Erstellen des Entwurfs');
    } finally {
      setLoading(false);
    }
  };

  const createCommunityThread = async () => {
    if (!draft) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Nicht angemeldet');
      }

      const finalDraft = {
        title: customTitle || draft.title,
        initialContent: {
          problem_description: customDescription || draft.problem_description,
          context: draft.context,
          meta: {
            escalated_from_chat: chatId,
            escalated_at: new Date().toISOString()
          }
        },
        tags: draft.tags
      };

      console.log('Creating community thread with data:', finalDraft);

      const response = await fetch('/api/community/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalDraft)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Community Threads');
      }

      const result = await response.json();
      console.log('Thread created successfully:', result);

      showSnackbar('Community Thread erfolgreich erstellt!', 'success');
      onClose();
      
      // Navigate to the new thread
      navigate(`/community/${result.data.id}`);
      
    } catch (err) {
      console.error('Error creating thread:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Threads');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDraft(null);
    setCustomTitle('');
    setCustomDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1
      }}>
        <CommunityIcon color="primary" />
        In Community analysieren
      </DialogTitle>
      
      <DialogContent dividers>
        {loading && !draft ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              Erstelle Entwurf für Community Thread...
            </Typography>
          </Box>
        ) : error && !draft ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : draft ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ihr Chat-Problem wird als strukturiertes Community-Dokument aufbereitet, 
              damit andere Kollegen gemeinsam an einer Lösung arbeiten können.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Title */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Titel
            </Typography>
            <TextField
              fullWidth
              placeholder={draft.title}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Lassen Sie leer, um den generierten Titel zu verwenden"
            />

            {/* Problem Description */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Problembeschreibung
            </Typography>
            <SimpleMarkdownEditor
              value={customDescription}
              onChange={setCustomDescription}
              placeholder={draft.problem_description}
              rows={4}
              editMode={descriptionEditMode}
              onModeChange={setDescriptionEditMode}
            />

            {/* Context Preview */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Extrahierter Kontext
            </Typography>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'grey.50', 
              borderRadius: 1, 
              mb: 2,
              maxHeight: 150,
              overflow: 'auto'
            }}>
              <Typography variant="body2" color="text.secondary">
                {draft.context}
              </Typography>
            </Box>

            {/* Tags */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Tags
            </Typography>
            <Box sx={{ mb: 2 }}>
              {draft.tags.map((tag, index) => (
                <Chip 
                  key={index} 
                  label={tag} 
                  size="small" 
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Nächste Schritte:</strong> Nach Erstellung wird das Living Document 
                geöffnet, wo Sie weitere Details hinzufügen und von der Community 
                Lösungsvorschläge erhalten können.
              </Typography>
            </Alert>
          </>
        ) : null}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleClose}
          startIcon={<CloseIcon />}
        >
          Abbrechen
        </Button>
        <Button
          onClick={draft ? createCommunityThread : generateDraft}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
        >
          {loading ? 'Erstelle...' : draft ? 'Thread erstellen' : 'Entwurf generieren'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommunityEscalationModal;
