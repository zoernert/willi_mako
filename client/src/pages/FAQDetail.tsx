import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Chat as ChatIcon,
  ArrowBack as BackIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import QuickNoteButton from '../components/Workspace/QuickNoteButton';
import TextSelectionMenu from '../components/Workspace/TextSelectionMenu';
import { useTextSelection } from '../hooks/useTextSelection';
import axios from 'axios';

interface FAQ {
  id: string;
  title: string;
  description: string;
  context: string;
  answer: string;
  additional_info: string;
  view_count: number;
  created_at: string;
  tags: string[];
}

const FAQDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [faq, setFaq] = useState<FAQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Text selection for creating notes
  const textSelection = useTextSelection({
    sourceType: 'faq',
    sourceId: id || 'unknown',
    containerId: 'faq-content-container'
  });

  useEffect(() => {
    if (id) {
      fetchFAQ(id);
    }
  }, [id]);

  const fetchFAQ = async (faqId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/faqs/${faqId}`);
      setFaq(response.data.data);
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      setError('Fehler beim Laden der FAQ');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChatFromFAQ = async () => {
    if (!state.user) {
      navigate('/login');
      return;
    }

    if (!faq) return;

    try {
      const response = await axios.post(`/faqs/${faq.id}/start-chat`);
      navigate(`/chat/${response.data.data.chat.id}`);
    } catch (error) {
      console.error('Error starting chat from FAQ:', error);
      showSnackbar('Fehler beim Starten des Chats', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !faq) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">
            {error || 'FAQ nicht gefunden'}
          </Alert>
          <Box mt={2}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/faq')}
              startIcon={<BackIcon />}
            >
              Zurück zur FAQ-Liste
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton 
              onClick={() => navigate('/faq')}
              sx={{ color: '#147a50' }}
            >
              <BackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" fontWeight="bold">
              FAQ Details
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            Detaillierte Antwort auf Ihre Frage
          </Typography>
        </Box>

        {/* FAQ Content */}
        <Paper 
          id="faq-content-container"
          sx={{ p: 4 }}
        >
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {faq.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {faq.tags && faq.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{ 
                    backgroundColor: '#147a50',
                    color: 'white',
                    mb: 0.5
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <ViewIcon fontSize="small" />
              <Typography variant="body2">
                {faq.view_count} mal angesehen
              </Typography>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Erstellt am {formatDate(faq.created_at)}
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Beschreibung
          </Typography>
          <Typography variant="body1" paragraph>
            {faq.description}
          </Typography>
          
          {faq.context && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Kontext
              </Typography>
              <Typography variant="body1" paragraph>
                {faq.context}
              </Typography>
            </>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Antwort
          </Typography>
          <div className="faq-content answer-content">
            <MarkdownRenderer>
              {faq.answer}
            </MarkdownRenderer>
          </div>
          
          {faq.additional_info && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Zusätzliche Informationen
              </Typography>
              <div className="faq-content additional-info-content">
                <MarkdownRenderer>
                  {faq.additional_info}
                </MarkdownRenderer>
              </div>
            </>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              onClick={handleStartChatFromFAQ}
              startIcon={<ChatIcon />}
              sx={{ backgroundColor: '#147a50', '&:hover': { backgroundColor: '#0d5538' } }}
            >
              Chat zu diesem Thema starten
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/faq')}
              sx={{ borderColor: '#147a50', color: '#147a50' }}
            >
              Zurück zur FAQ-Liste
            </Button>
            
            {/* Quick Note Button */}
            <QuickNoteButton
              sourceType="faq"
              sourceId={faq.id}
              position="relative"
            />
          </Box>
        </Paper>
        
        {/* Text Selection Menu */}
        <TextSelectionMenu
          anchorEl={textSelection.anchorEl}
          selectedText={textSelection.selectedText}
          sourceType={textSelection.sourceType}
          sourceId={textSelection.sourceId}
          sourceContext={textSelection.sourceContext}
          onClose={textSelection.onClose}
        />
      </Box>
    </Container>
  );
};

export default FAQDetail;
