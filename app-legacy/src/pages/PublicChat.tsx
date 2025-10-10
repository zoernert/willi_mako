import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Alert,
  List,
  ListItem,
  Avatar,
  IconButton,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as BotIcon,
  ArrowBack as ArrowBackIcon,
  Login as LoginIcon,
  Chat as ChatIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatApi, Message } from '../services/chatApi';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const PublicChat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(state.user);

  const shareUrl = useMemo(() => {
    if (!chatId) {
      return '';
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/app/share/chat/${chatId}`;
    }

    return `/app/share/chat/${chatId}`;
  }, [chatId]);

  useEffect(() => {
    const fetchPublicChat = async () => {
      if (!chatId) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await chatApi.getPublicChat(chatId);
        setChatTitle(response.chat?.title || 'Geteilter Chat');
        setMessages(response.messages || []);
      } catch (fetchError: any) {
        console.error('Error loading public chat:', fetchError);
        setError('Dieser Chat ist nicht öffentlich verfügbar oder wurde entfernt.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicChat();
  }, [chatId]);

  const handleCopyLink = async () => {
    if (!shareUrl) {
      return;
    }

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showSnackbar('Freigabelink kopiert.', 'success');
        return;
      } catch (copyError) {
        console.warn('Clipboard copy failed:', copyError);
      }
    }

    showSnackbar('Link konnte nicht automatisch kopiert werden. Bitte manuell kopieren.', 'error');
  };

  const handleContinue = () => {
    if (!chatId) {
      navigate('/chat');
      return;
    }

    if (isAuthenticated) {
      navigate(`/chat/${chatId}`);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(`/chat/${chatId}`)}`);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                Öffentlich geteilter Chat
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {chatTitle || 'Dieser Chat wurde für externe Betrachtung freigegeben.'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="Freigabelink kopieren">
                <span>
                  <IconButton onClick={handleCopyLink} color="primary" size="small" disabled={!shareUrl}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
              >
                Zurück
              </Button>
            </Box>
          </Box>

          {shareUrl && (
            <Box
              sx={{
                mb: 3,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'grey.100',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Freigabelink
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-all' }}>
                {shareUrl}
              </Typography>
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : messages.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Kein Chatverlauf vorhanden.
            </Alert>
          ) : (
            <List sx={{ mb: 3 }}>
              {messages.map((message) => (
                <ListItem
                  key={`${message.id}-${message.created_at}`}
                  sx={{
                    alignItems: 'flex-start',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    mb: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      mx: 1,
                      bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                    }}
                  >
                    {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                  </Avatar>
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                      color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content || ''}
                    </ReactMarkdown>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(message.created_at)}
                    </Typography>
                  </Paper>
                </ListItem>
              ))}
            </List>
          )}

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Melden Sie sich an, um diesen Chat fortzuführen und weitere Antworten zu erhalten.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleContinue}
              startIcon={isAuthenticated ? <ChatIcon /> : <LoginIcon />}
            >
              {isAuthenticated ? 'Im Chat fortfahren' : 'Anmelden und fortfahren'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PublicChat;
