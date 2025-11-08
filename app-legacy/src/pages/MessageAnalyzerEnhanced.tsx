// app-legacy/src/pages/MessageAnalyzerEnhanced.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Box,
  IconButton,
  Chip,
  Divider,
  Tooltip,
  Alert,
  Stack,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { messageAnalyzerApi } from '../services/messageAnalyzerApi';
import { useSnackbar } from '../contexts/SnackbarContext';
import { diffLines, Change } from 'diff';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface MessageVersion {
  content: string;
  timestamp: string;
  changeDescription?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  messageType?: string;
  segmentCount: number;
}

const MessageAnalyzerEnhanced: React.FC = () => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState<MessageVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);
  const [initialAnalysis, setInitialAnalysis] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const { showSnackbar } = useSnackbar();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Initialize message history when a new message is set
  useEffect(() => {
    if (currentMessage && messageHistory.length === 0) {
      setMessageHistory([{
        content: currentMessage,
        timestamp: new Date().toISOString(),
        changeDescription: 'Initiale Nachricht'
      }]);
    }
  }, [currentMessage, messageHistory.length]);

  const handleInitialAnalysis = async () => {
    if (!currentMessage.trim()) {
      showSnackbar('Bitte geben Sie eine EDIFACT-Nachricht ein.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const result = await messageAnalyzerApi.getAIExplanation(currentMessage);
      setInitialAnalysis(result.explanation);
      
      // Initialize message history
      setMessageHistory([{
        content: currentMessage,
        timestamp: new Date().toISOString(),
        changeDescription: 'Initiale Nachricht'
      }]);
      setCurrentVersionIndex(0);

      // Validate the message
      await validateMessage(currentMessage);
      
      showSnackbar('Analyse erfolgreich durchgeführt!', 'success');
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.error?.message || 'Fehler bei der Analyse.',
        'error'
      );
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateMessage = async (message: string) => {
    try {
      const result = await messageAnalyzerApi.validate(message);
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !currentMessage) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Check if this is a modification request
      const isModificationRequest = /änder|modifizier|erhöh|setz|ersetze/i.test(chatInput);

      if (isModificationRequest) {
        // Handle as modification
        const result = await messageAnalyzerApi.modify(chatInput, currentMessage);
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: `Ich habe die Nachricht wie gewünscht angepasst. Die Änderungen wurden vorgenommen.`,
          timestamp: new Date().toISOString(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);

        // Add to message history
        const newVersion: MessageVersion = {
          content: result.modifiedMessage,
          timestamp: new Date().toISOString(),
          changeDescription: chatInput,
        };
        
        setMessageHistory(prev => [...prev, newVersion]);
        setCurrentVersionIndex(messageHistory.length);
        setCurrentMessage(result.modifiedMessage);
        setShowDiff(true);

        // Validate the modified message
        await validateMessage(result.modifiedMessage);
        
        showSnackbar('Nachricht wurde erfolgreich modifiziert!', 'success');
      } else {
        // Handle as chat question
        const response = await messageAnalyzerApi.chat(chatInput, chatHistory, currentMessage);
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.error?.message || 'Fehler beim Verarbeiten der Anfrage.',
        'error'
      );
      console.error('Chat error:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleUndo = () => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      setCurrentMessage(messageHistory[newIndex].content);
      validateMessage(messageHistory[newIndex].content);
      showSnackbar('Änderung rückgängig gemacht', 'info');
    }
  };

  const handleRedo = () => {
    if (currentVersionIndex < messageHistory.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      setCurrentMessage(messageHistory[newIndex].content);
      validateMessage(messageHistory[newIndex].content);
      showSnackbar('Änderung wiederhergestellt', 'info');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      showSnackbar('In Zwischenablage kopiert!', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Kopieren', 'error');
    }
  };

  const renderDiff = () => {
    if (currentVersionIndex === 0 || !showDiff) return null;

    const previousVersion = messageHistory[currentVersionIndex - 1].content;
    const currentVersion = currentMessage;
    const diff = diffLines(previousVersion, currentVersion);

    return (
      <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6">Änderungen</Typography>
          <IconButton size="small" onClick={() => setShowDiff(false)}>
            ✕
          </IconButton>
        </Box>
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            whiteSpace: 'pre-wrap',
            maxHeight: '300px',
            overflow: 'auto',
          }}
        >
          {diff.map((part: Change, index: number) => (
            <Box
              key={index}
              component="span"
              sx={{
                backgroundColor: part.added
                  ? '#c8e6c9'
                  : part.removed
                  ? '#ffcdd2'
                  : 'transparent',
                textDecoration: part.removed ? 'line-through' : 'none',
                display: 'block',
              }}
            >
              {part.value}
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Energiemarkt-Nachrichten Analyzer (Erweitert)
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Analysieren, hinterfragen und bearbeiten Sie EDIFACT-Nachrichten interaktiv mit KI-Unterstützung
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        {/* Left Panel - Message Input & Display */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              EDIFACT-Nachricht
            </Typography>
            
            {/* Message History Controls */}
            {messageHistory.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <Tooltip title="Rückgängig">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleUndo}
                      disabled={currentVersionIndex === 0}
                    >
                      <UndoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Wiederherstellen">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleRedo}
                      disabled={currentVersionIndex === messageHistory.length - 1}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Typography variant="caption" color="textSecondary">
                  Version {currentVersionIndex + 1} von {messageHistory.length}
                </Typography>
                {messageHistory[currentVersionIndex]?.changeDescription && (
                  <Chip
                    label={messageHistory[currentVersionIndex].changeDescription}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            )}

            <TextField
              multiline
              rows={12}
              fullWidth
              variant="outlined"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Fügen Sie Ihre EDIFACT-Nachricht hier ein..."
              sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}
              disabled={loading || modifyLoading}
            />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleInitialAnalysis}
                disabled={loading || !currentMessage.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <SmartToyIcon />}
              >
                {loading ? 'Analysiere...' : 'KI-Analyse starten'}
              </Button>
              
              <Tooltip title="In Zwischenablage kopieren">
                <IconButton
                  color="primary"
                  onClick={handleCopyToClipboard}
                  disabled={!currentMessage}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>

              {messageHistory.length > 1 && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CompareArrowsIcon />}
                  onClick={() => setShowDiff(!showDiff)}
                >
                  {showDiff ? 'Diff ausblenden' : 'Änderungen anzeigen'}
                </Button>
              )}
            </Box>
          </Paper>

          {/* Diff Display */}
          {renderDiff()}

          {/* Validation Results */}
          {validation && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Validierung
              </Typography>
              
              <Stack spacing={1}>
                {validation.isValid ? (
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    Nachricht ist strukturell gültig
                  </Alert>
                ) : (
                  <Alert severity="error" icon={<ErrorIcon />}>
                    Validierungsfehler gefunden
                  </Alert>
                )}

                {validation.messageType && (
                  <Box>
                    <Chip label={`Typ: ${validation.messageType}`} color="primary" size="small" />
                    <Chip label={`${validation.segmentCount} Segmente`} size="small" sx={{ ml: 1 }} />
                  </Box>
                )}

                {validation.errors.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="error" sx={{ mt: 1 }}>
                      Fehler:
                    </Typography>
                    {validation.errors.map((error, idx) => (
                      <Alert key={idx} severity="error" sx={{ mt: 0.5 }}>
                        {error}
                      </Alert>
                    ))}
                  </Box>
                )}

                {validation.warnings.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="warning.main" sx={{ mt: 1 }}>
                      Warnungen:
                    </Typography>
                    {validation.warnings.map((warning, idx) => (
                      <Alert key={idx} severity="warning" icon={<WarningIcon />} sx={{ mt: 0.5 }}>
                        {warning}
                      </Alert>
                    ))}
                  </Box>
                )}
              </Stack>
            </Paper>
          )}

          {/* Initial Analysis */}
          {initialAnalysis && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Initiale KI-Analyse
              </Typography>
              <Box
                sx={{
                  '& h1, & h2, & h3': { fontWeight: 600, mt: 2 },
                  '& p': { mb: 1.5 },
                  '& ul, & ol': { pl: 3, mb: 1.5 },
                  '& code': {
                    fontFamily: 'monospace',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    px: 0.5,
                  },
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {initialAnalysis}
                </ReactMarkdown>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Right Panel - Interactive Chat */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Interaktiver Chat
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Stellen Sie Fragen zur Nachricht oder geben Sie Änderungsaufträge
            </Typography>

            <Divider sx={{ mb: 2 }} />

            {/* Chat Messages */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                mb: 2,
                minHeight: '400px',
                maxHeight: '600px',
              }}
            >
              {chatHistory.length === 0 ? (
                <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
                  <SmartToyIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body2">
                    Starten Sie einen Chat, um Fragen zu stellen oder Änderungen vorzunehmen
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Beispiele:
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                    • "In welchem Zeitfenster ist der Verbrauch am höchsten?"
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                    • "Erhöhe den Verbrauch in jedem Zeitfenster um 10%"
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                    • "Ändere die Marktpartnerkennung des Absenders auf XYZ"
                  </Typography>
                </Box>
              ) : (
                <>
                  {chatHistory.map((msg, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '80%',
                          backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                        }}
                      >
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                          {msg.role === 'user' ? 'Sie' : 'KI-Assistent'}
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                          {new Date(msg.timestamp).toLocaleTimeString('de-DE')}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  {chatLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                      <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                        <CircularProgress size={20} />
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          KI antwortet...
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </Box>

            {/* Chat Input */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder="Frage stellen oder Änderungsauftrag eingeben..."
                disabled={chatLoading || !currentMessage || !initialAnalysis}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim() || !currentMessage}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default MessageAnalyzerEnhanced;
