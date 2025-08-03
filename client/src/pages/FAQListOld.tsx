import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Visibility as ViewIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import FAQItem from '../components/FAQ/FAQItem';
import { FAQWithLinks } from '../types/faq';
import apiClient from '../services/apiClient';

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

const FAQList: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQWithLinks | null>(null);
  const [showFAQDialog, setShowFAQDialog] = useState(false);
  const navigate = useNavigate();
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      // Use public endpoint for FAQ list with links
      const response = await apiClient.get('/public/faqs') as any;
      setFaqs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setError('Fehler beim Laden der FAQs');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChatFromFAQ = async (faqId: string) => {
    if (!state.user) {
      navigate('/login');
      return;
    }

    try {
      const response = await apiClient.post(`/faqs/${faqId}/start-chat`) as any;
      navigate(`/chat/${response.chat.id}`);
    } catch (error) {
      console.error('Error starting chat from FAQ:', error);
      showSnackbar('Fehler beim Starten des Chats', 'error');
    }
  };

  const handleFAQClick = (faqId: string) => {
    const faq = faqs.find(f => f.id === faqId);
    if (faq) {
      setSelectedFAQ(faq);
      setShowFAQDialog(true);
      // Update URL without navigation
      window.history.pushState(null, '', `#faq-${faqId}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#2c5530' }}>
          Häufig gestellte Fragen
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Hier finden Sie Antworten auf die häufigsten Fragen. Klicken Sie auf einen Begriff in den Antworten, um zu verwandten Themen zu navigieren.
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {faqs && faqs.length > 0 ? faqs.map((faq) => (
            <FAQItem 
              key={faq.id}
              faq={faq}
              onFAQClick={handleFAQClick}
              showFullContent={true}
            />
          )) : (
            <Typography variant="body1" color="text.secondary">
              Keine FAQs verfügbar.
            </Typography>
          )}
        </Box>
      </Box>

      {/* FAQ Detail Dialog */}
      <Dialog 
        open={showFAQDialog} 
        onClose={() => setShowFAQDialog(false)} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon />
            FAQ Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFAQ && (
            <FAQItem 
              faq={selectedFAQ}
              onFAQClick={handleFAQClick}
              showFullContent={true}
            />
          )}
        </DialogContent>
        <DialogActions>
          {selectedFAQ && state.user && (
            <Button
              onClick={() => handleStartChatFromFAQ(selectedFAQ.id)}
              variant="contained"
              startIcon={<ChatIcon />}
            >
              Chat starten
            </Button>
          )}
          <Button onClick={() => setShowFAQDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FAQList;
